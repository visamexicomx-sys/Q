"""Backtester for the option strategies (optopsy-style).

Replays historical option-chain snapshots through the same scanner + strategy
code the live bot uses, simulates fills under the risk budget, then realises
P&L either at expiry (using recorded settlement prices) or via a convergence
assumption. Reports trade-by-trade P&L plus aggregate metrics so you can check
an edge exists before risking capital.

Pure standard library. Data format (JSON):

    {
      "settlement": { "<expiry_ms>": { "BTC": 95000.0, "ETH": 3400.0 } },
      "snapshots":  [ { "ts": 1700000000000, "quotes": [ <OptionQuote dict>, ... ] }, ... ]
    }

A quote dict uses the OptionQuote field names (symbol, base_coin, expiry_ms,
strike, is_call, forward, bid, bid_size, ask, ask_size, mark_price, mark_iv,
ask_iv, delta, open_interest, volume_24h).
"""

from __future__ import annotations

import json
import math
import statistics
from dataclasses import dataclass, field

from .scanner import OptionQuote, ScanConfig, scan_underlying
from .strategy import InstrumentSpec, StrategyConfig, build_trade_plan


def quote_from_dict(d: dict) -> OptionQuote:
    return OptionQuote(
        symbol=d["symbol"],
        base_coin=d["base_coin"],
        expiry_ms=int(d["expiry_ms"]),
        strike=float(d["strike"]),
        is_call=bool(d["is_call"]),
        forward=float(d.get("forward", 0.0)),
        bid=float(d.get("bid", 0.0)),
        bid_size=float(d.get("bid_size", 0.0)),
        ask=float(d.get("ask", 0.0)),
        ask_size=float(d.get("ask_size", 0.0)),
        mark_price=float(d.get("mark_price", 0.0)),
        mark_iv=float(d.get("mark_iv", 0.0)),
        ask_iv=(float(d["ask_iv"]) if d.get("ask_iv") not in (None, "") else None),
        delta=(float(d["delta"]) if d.get("delta") not in (None, "") else None),
        open_interest=float(d.get("open_interest", 0.0)),
        volume_24h=float(d.get("volume_24h", 0.0)),
    )


@dataclass
class BTTrade:
    kind: str
    symbol: str
    coin: str
    is_call: bool
    strike: float
    expiry_ms: int
    qty: float
    entry_price: float
    premium: float
    delta: float
    entry_forward: float
    hedge_qty: float
    hedge_side: str  # "Sell" | "Buy" | ""
    entry_ts: int
    edge_usd: float  # per-contract theoretical edge at entry
    exit_ts: int = 0
    payoff: float = 0.0
    option_pnl: float = 0.0
    hedge_pnl: float = 0.0
    pnl: float = 0.0
    status: str = "open"


@dataclass
class BacktestConfig:
    mode: str = "to_expiry"  # "to_expiry" | "convergence"
    convergence_factor: float = 0.5  # fraction of edge captured in convergence mode
    max_open_positions: int = 50
    max_total_premium: float = 1e9  # set from RiskConfig if desired


@dataclass
class BacktestResult:
    trades: list[BTTrade] = field(default_factory=list)

    def closed(self) -> list[BTTrade]:
        return [t for t in self.trades if t.status == "closed"]

    def metrics(self) -> dict:
        closed = self.closed()
        n = len(closed)
        if n == 0:
            return {"trades": 0}
        pnls = [t.pnl for t in closed]
        premiums = [t.premium for t in closed if t.premium > 0]
        wins = [p for p in pnls if p > 0]
        rets = [t.pnl / t.premium for t in closed if t.premium > 0]
        total = sum(pnls)
        gross_win = sum(p for p in pnls if p > 0)
        gross_loss = -sum(p for p in pnls if p < 0)
        # Max drawdown on the realised equity curve (ordered by exit time).
        cum = 0.0
        peak = 0.0
        max_dd = 0.0
        for t in sorted(closed, key=lambda x: x.exit_ts):
            cum += t.pnl
            peak = max(peak, cum)
            max_dd = max(max_dd, peak - cum)
        sharpe = 0.0
        if len(rets) > 1:
            sd = statistics.pstdev(rets)
            if sd > 0:
                sharpe = statistics.fmean(rets) / sd
        by_kind: dict[str, dict] = {}
        for t in closed:
            k = by_kind.setdefault(t.kind, {"trades": 0, "pnl": 0.0})
            k["trades"] += 1
            k["pnl"] += t.pnl
        return {
            "trades": n,
            "total_pnl": total,
            "win_rate": len(wins) / n,
            "avg_pnl": total / n,
            "avg_return": (statistics.fmean(rets) if rets else 0.0),
            "total_premium": sum(premiums),
            "profit_factor": (gross_win / gross_loss if gross_loss > 0 else float("inf")),
            "max_drawdown": max_dd,
            "sharpe_per_trade": sharpe,
            "by_kind": by_kind,
        }


class Backtester:
    def __init__(
        self,
        scan_cfg: ScanConfig | None = None,
        strat_cfg: StrategyConfig | None = None,
        bt_cfg: BacktestConfig | None = None,
    ):
        self.scan_cfg = scan_cfg or ScanConfig()
        self.strat_cfg = strat_cfg or StrategyConfig()
        self.bt = bt_cfg or BacktestConfig()

    def run(self, snapshots: list[dict], settlement: dict) -> BacktestResult:
        result = BacktestResult()
        open_trades: list[BTTrade] = []
        held_symbols: set[str] = set()
        open_premium = 0.0
        settle = _normalise_settlement(settlement)

        for snap in sorted(snapshots, key=lambda s: s["ts"]):
            ts = int(snap["ts"])

            # 1) Close positions that have expired and have settlement data.
            still_open = []
            for tr in open_trades:
                if tr.expiry_ms <= ts:
                    s = settle.get(tr.expiry_ms, {}).get(tr.coin)
                    if s is not None:
                        self._close(tr, ts, s)
                        open_premium -= tr.premium
                        held_symbols.discard(tr.symbol)
                        continue
                still_open.append(tr)
            open_trades = still_open

            # 2) Scan this snapshot and open new positions.
            quotes = [quote_from_dict(q) for q in snap.get("quotes", [])]
            by_coin: dict[str, list[OptionQuote]] = {}
            for q in quotes:
                by_coin.setdefault(q.base_coin, []).append(q)

            for coin, group in by_coin.items():
                signals = scan_underlying(group, ts, self.scan_cfg)
                for sig in signals:
                    if not sig.tradeable or sig.symbol in held_symbols:
                        continue
                    if len(open_trades) >= self.bt.max_open_positions:
                        break
                    spec = _spec_for(group, sig.symbol)
                    plan = build_trade_plan(sig, spec, self.strat_cfg, spec)
                    if plan.reject_reason:
                        continue
                    if open_premium + plan.premium_usd > self.bt.max_total_premium:
                        continue
                    tr = _trade_from_plan(plan, ts)
                    result.trades.append(tr)
                    open_trades.append(tr)
                    held_symbols.add(tr.symbol)
                    open_premium += tr.premium

        # 3) Settle any leftover expired positions at the end.
        for tr in open_trades:
            s = settle.get(tr.expiry_ms, {}).get(tr.coin)
            if s is not None:
                self._close(tr, tr.expiry_ms, s)

        return result

    def _close(self, tr: BTTrade, exit_ts: int, settle_price: float) -> None:
        fee = self.scan_cfg.fee_rate
        if self.bt.mode == "convergence":
            # Assume a fraction of the theoretical edge is captured.
            tr.option_pnl = self.bt.convergence_factor * tr.edge_usd * tr.qty
            tr.hedge_pnl = 0.0
            tr.payoff = tr.entry_price + tr.option_pnl / tr.qty if tr.qty else 0.0
        else:  # to_expiry
            intrinsic = (
                max(settle_price - tr.strike, 0.0)
                if tr.is_call
                else max(tr.strike - settle_price, 0.0)
            )
            tr.payoff = intrinsic * tr.qty
            tr.option_pnl = tr.payoff - tr.premium
            # Static delta hedge held to expiry (approximation: no re-hedging).
            if tr.hedge_side == "Sell":
                tr.hedge_pnl = (tr.entry_forward - settle_price) * tr.hedge_qty
            elif tr.hedge_side == "Buy":
                tr.hedge_pnl = (settle_price - tr.entry_forward) * tr.hedge_qty
        # Fees: option entry + (exit only if it had value), plus hedge round-trip.
        fees = tr.premium * fee + tr.payoff * fee
        fees += self.scan_cfg.perp_fee_rate * tr.entry_forward * tr.hedge_qty * 2
        tr.pnl = tr.option_pnl + tr.hedge_pnl - fees
        tr.exit_ts = exit_ts
        tr.status = "closed"


def _trade_from_plan(plan, ts: int) -> BTTrade:
    sig = plan.signal
    opt = plan.option_leg
    hedge = plan.hedge_leg
    return BTTrade(
        kind=sig.kind,
        symbol=sig.symbol,
        coin=sig.base_coin,
        is_call=sig.is_call,
        strike=sig.strike,
        expiry_ms=sig.expiry_ms,
        qty=opt.qty,
        entry_price=opt.price or sig.ask,
        premium=plan.premium_usd,
        delta=sig.delta,
        entry_forward=sig.forward,
        hedge_qty=hedge.qty if hedge else 0.0,
        hedge_side=hedge.side if hedge else "",
        entry_ts=ts,
        edge_usd=sig.edge_usd,
    )


def _spec_for(group: list[OptionQuote], symbol: str) -> InstrumentSpec:
    # Backtests don't carry exchange specs; infer a sane step from the strike scale.
    q = next((x for x in group if x.symbol == symbol), None)
    step = 0.01
    if q is not None and q.forward >= 1000:
        step = 0.01
    return InstrumentSpec(symbol=symbol, qty_step=step, min_qty=step, tick_size=0.01)


def _normalise_settlement(settlement: dict) -> dict[int, dict]:
    out: dict[int, dict] = {}
    for k, v in (settlement or {}).items():
        try:
            out[int(k)] = v
        except (TypeError, ValueError):
            continue
    return out


def load_data(path: str) -> tuple[list[dict], dict]:
    with open(path) as fh:
        data = json.load(fh)
    return data.get("snapshots", []), data.get("settlement", {})


def generate_synthetic(seed: int = 7, days: int = 30, cheap_edge: float = 0.06) -> tuple[list[dict], dict]:
    """Deterministic synthetic dataset: GBM price paths + a cheap-priced chain.

    Every option's ask is priced `cheap_edge` vol points below its own mark IV,
    so the scanner finds an edge; holding to expiry against the realised path
    tests whether buying that cheap vol actually pays. For demo/tests only.
    """
    import random

    from .pricing import black76_price

    rnd = random.Random(seed)
    coins = {"BTC": 100_000.0, "ETH": 3_500.0, "SOL": 180.0}
    day_ms = 86_400_000
    now0 = 1_700_000_000_000
    expiry_ms = now0 + days * day_ms
    sigma_d = 0.65 / math.sqrt(365)  # ~65% annual vol

    # Build price paths.
    paths: dict[str, list[float]] = {}
    for coin, s0 in coins.items():
        s = s0
        seq = [s]
        for _ in range(days):
            s *= math.exp(rnd.gauss(-0.5 * sigma_d**2, sigma_d))
            seq.append(s)
        paths[coin] = seq

    snapshots = []
    for day in range(0, days - 2):  # leave DTE > 0
        ts = now0 + day * day_ms
        t = max((expiry_ms - ts) / (365 * day_ms), 1e-6)
        quotes = []
        for coin, s0 in coins.items():
            spot = paths[coin][day]
            for mult in (0.80, 0.85, 0.90, 0.95, 1.0, 1.05, 1.10, 1.15, 1.20, 1.30):
                strike = round(spot * mult, 2)
                k = math.log(strike / spot)
                mark_iv = 0.60 + 1.0 * k * k
                is_call = strike >= spot
                ask = black76_price(spot, strike, mark_iv - cheap_edge, t, is_call)
                if ask <= 0:
                    continue
                quotes.append({
                    "symbol": f"{coin}-BT-{strike:g}-{'C' if is_call else 'P'}",
                    "base_coin": coin, "expiry_ms": expiry_ms, "strike": strike,
                    "is_call": is_call, "forward": spot,
                    "bid": ask * 0.9, "bid_size": 10, "ask": ask, "ask_size": 10,
                    "mark_price": black76_price(spot, strike, mark_iv, t, is_call),
                    "mark_iv": mark_iv, "ask_iv": None, "open_interest": 100,
                })
        snapshots.append({"ts": ts, "quotes": quotes})

    settlement = {str(expiry_ms): {c: paths[c][days] for c in coins}}
    return snapshots, settlement


def format_metrics(m: dict) -> str:
    if m.get("trades", 0) == 0:
        return "No closed trades in backtest."
    lines = [
        "=== Backtest result ===",
        f"Trades:        {m['trades']}",
        f"Total P&L:     {m['total_pnl']:+.2f} USDC",
        f"Avg P&L/trade: {m['avg_pnl']:+.2f} USDC",
        f"Avg return:    {m['avg_return']:+.1%}",
        f"Win rate:      {m['win_rate']:.0%}",
        f"Profit factor: {m['profit_factor']:.2f}",
        f"Max drawdown:  {m['max_drawdown']:.2f} USDC",
        f"Sharpe/trade:  {m['sharpe_per_trade']:.2f}",
        f"Premium used:  {m['total_premium']:.2f} USDC",
        "By strategy:",
    ]
    for k, v in sorted(m["by_kind"].items(), key=lambda kv: kv[1]["pnl"], reverse=True):
        lines.append(f"  {k}: {v['trades']} trades, {v['pnl']:+.2f} USDC")
    return "\n".join(lines)
