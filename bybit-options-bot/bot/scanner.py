"""Anomaly scanner: find options trading anomalously cheap vs the fitted smile.

Two kinds of edge are detected, per underlying:

  1. ARBITRAGE  — the ask is below the option's discounted intrinsic value
     (after fees). Essentially free money; flagged with the highest severity.

  2. CHEAP_VOL  — the implied vol of the *ask* sits well below the fair IV from
     the fitted smile for that expiry. We buy cheap volatility and (in the
     strategy layer) delta-hedge it, so the residual bet is "realised vol will
     beat the cheap implied we paid", not market direction.

Every candidate must also clear liquidity, spread and time-to-expiry filters so
we never chase a stale or untradeable quote.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .pricing import black76_price, implied_vol, log_moneyness, years_to_expiry
from .surface import Smile, SmilePoint, fit_smile


@dataclass
class OptionQuote:
    symbol: str
    base_coin: str  # BTC / ETH / SOL
    expiry_ms: int
    strike: float
    is_call: bool
    forward: float  # underlyingPrice / index forward
    bid: float
    bid_size: float
    ask: float
    ask_size: float
    mark_price: float
    mark_iv: float  # Bybit markIv (mid vol) — used to build the smile
    ask_iv: float | None = None  # Bybit ask1Iv; solved from price if absent
    delta: float | None = None  # Bybit greek (per coin), used for hedging
    gamma: float | None = None
    vega: float | None = None
    theta: float | None = None
    open_interest: float = 0.0
    volume_24h: float = 0.0


@dataclass
class ScanConfig:
    risk_free_rate: float = 0.0
    fee_rate: float = 0.0003  # taker fee fraction of premium per side (Bybit options)
    min_edge_pct: float = 0.08  # ask must be >= 8% below fair value
    min_edge_usd: float = 1.0  # and at least this many USDC of edge per contract
    min_vol_edge: float = 0.03  # ask IV must be >= 3 vol points below fair IV
    min_resid_sigma: float = 1.5  # ...and that gap must exceed N robust sigmas
    min_ask_size: float = 0.0  # require resting ask liquidity (coin units)
    max_spread_pct: float = 0.35  # reject books wider than 35% (bid/ask mid)
    min_oi: float = 0.0
    min_days_to_expiry: float = 0.25
    max_days_to_expiry: float = 120.0
    min_abs_delta: float = 0.05  # skip near-worthless wings
    max_abs_delta: float = 0.90  # skip deep ITM (mostly intrinsic, no vol edge)
    min_smile_points: int = 4


@dataclass
class Signal:
    kind: str  # "ARBITRAGE" | "CHEAP_VOL"
    symbol: str
    base_coin: str
    is_call: bool
    strike: float
    expiry_ms: int
    days_to_expiry: float
    forward: float
    ask: float
    ask_size: float
    fair_price: float
    fair_iv: float
    ask_iv: float
    edge_usd: float  # fair - ask, per coin unit
    edge_pct: float
    vol_edge: float  # fair_iv - ask_iv
    resid_sigma: float  # vol_edge / smile residual std
    delta: float
    gamma: float
    vega: float
    score: float
    notes: str = ""


def _spread_pct(bid: float, ask: float) -> float:
    if ask <= 0 or bid <= 0:
        return 1.0
    mid = 0.5 * (bid + ask)
    return (ask - bid) / mid if mid > 0 else 1.0


def _build_smile(quotes: list[OptionQuote], expiry_ms: int, cfg: ScanConfig) -> Smile | None:
    points: list[SmilePoint] = []
    for q in quotes:
        if q.mark_iv <= 0 or q.forward <= 0 or q.strike <= 0:
            continue
        k = log_moneyness(q.strike, q.forward)
        # Weight by liquidity: tighter spread + more open interest => more trust.
        spread = _spread_pct(q.bid, q.ask)
        w = 1.0 / (0.02 + spread)
        if q.open_interest > 0:
            w *= 1.0 + min(q.open_interest, 1000.0) / 1000.0
        points.append(SmilePoint(k=k, iv=q.mark_iv, weight=w))
    return fit_smile(expiry_ms, points, min_points=cfg.min_smile_points)


def scan_underlying(
    quotes: list[OptionQuote], now_ms: int, cfg: ScanConfig | None = None
) -> list[Signal]:
    """Scan one underlying's full option chain and return ranked signals."""
    cfg = cfg or ScanConfig()
    by_expiry: dict[int, list[OptionQuote]] = {}
    for q in quotes:
        by_expiry.setdefault(q.expiry_ms, []).append(q)

    signals: list[Signal] = []
    for expiry_ms, group in by_expiry.items():
        t = years_to_expiry(expiry_ms, now_ms)
        days = t * 365.0
        if days < cfg.min_days_to_expiry or days > cfg.max_days_to_expiry:
            continue
        smile = _build_smile(group, expiry_ms, cfg)
        if smile is None:
            continue

        for q in group:
            sig = _evaluate_quote(q, smile, t, days, cfg)
            if sig is not None:
                signals.append(sig)

    signals.sort(key=lambda s: s.score, reverse=True)
    return signals


def _evaluate_quote(
    q: OptionQuote, smile: Smile, t: float, days: float, cfg: ScanConfig
) -> Signal | None:
    if q.ask <= 0 or q.forward <= 0 or q.strike <= 0:
        return None
    if q.ask_size < cfg.min_ask_size:
        return None
    if q.open_interest < cfg.min_oi:
        return None
    if _spread_pct(q.bid, q.ask) > cfg.max_spread_pct:
        return None

    df_intrinsic = max(q.forward - q.strike, 0.0) if q.is_call else max(q.strike - q.forward, 0.0)
    fee = q.ask * cfg.fee_rate

    # --- 1. Hard arbitrage: ask + fee below intrinsic ---------------------
    if df_intrinsic > 0 and (q.ask + fee) < df_intrinsic:
        edge = df_intrinsic - q.ask
        return Signal(
            kind="ARBITRAGE",
            symbol=q.symbol,
            base_coin=q.base_coin,
            is_call=q.is_call,
            strike=q.strike,
            expiry_ms=q.expiry_ms,
            days_to_expiry=days,
            forward=q.forward,
            ask=q.ask,
            ask_size=q.ask_size,
            fair_price=df_intrinsic,
            fair_iv=0.0,
            ask_iv=0.0,
            edge_usd=edge,
            edge_pct=edge / q.ask,
            vol_edge=0.0,
            resid_sigma=999.0,
            delta=q.delta if q.delta is not None else (1.0 if q.is_call else -1.0),
            gamma=q.gamma or 0.0,
            vega=q.vega or 0.0,
            score=1e6 + edge,  # arbitrage always ranks above vol signals
            notes="ask below intrinsic (incl. fees)",
        )

    # --- 2. Cheap volatility vs fitted smile ------------------------------
    fair_iv = smile.fair_iv(log_moneyness(q.strike, q.forward))
    ask_iv = q.ask_iv
    if ask_iv is None or ask_iv <= 0:
        ask_iv = implied_vol(q.ask, q.forward, q.strike, t, q.is_call, cfg.risk_free_rate)
    if ask_iv is None or ask_iv <= 0:
        return None

    vol_edge = fair_iv - ask_iv
    if vol_edge < cfg.min_vol_edge:
        return None

    resid_std = max(smile.residual_std, 1e-4)
    resid_sigma = vol_edge / resid_std
    if smile.n_points >= cfg.min_smile_points and resid_sigma < cfg.min_resid_sigma:
        return None

    fair_price = black76_price(q.forward, q.strike, fair_iv, t, q.is_call, cfg.risk_free_rate)
    edge_usd = fair_price - q.ask
    if edge_usd < cfg.min_edge_usd:
        return None
    edge_pct = edge_usd / q.ask
    if edge_pct < cfg.min_edge_pct:
        return None

    delta = q.delta
    if delta is None:
        from .pricing import black76_greeks

        delta = black76_greeks(q.forward, q.strike, ask_iv, t, q.is_call, cfg.risk_free_rate).delta
    if not (cfg.min_abs_delta <= abs(delta) <= cfg.max_abs_delta):
        return None

    # Score blends relative edge, statistical confidence and liquidity so the
    # strategy layer acts on the most reliable mispricings first.
    score = edge_pct * 100.0 + resid_sigma * 5.0 + min(q.ask_size, 5.0)
    return Signal(
        kind="CHEAP_VOL",
        symbol=q.symbol,
        base_coin=q.base_coin,
        is_call=q.is_call,
        strike=q.strike,
        expiry_ms=q.expiry_ms,
        days_to_expiry=days,
        forward=q.forward,
        ask=q.ask,
        ask_size=q.ask_size,
        fair_price=fair_price,
        fair_iv=fair_iv,
        ask_iv=ask_iv,
        edge_usd=edge_usd,
        edge_pct=edge_pct,
        vol_edge=vol_edge,
        resid_sigma=resid_sigma,
        delta=delta,
        gamma=q.gamma or 0.0,
        vega=q.vega or 0.0,
        score=score,
        notes=f"ask IV {ask_iv:.1%} vs fair {fair_iv:.1%}",
    )
