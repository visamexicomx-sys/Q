"""Adapt raw Bybit V5 payloads into the typed objects used by the scanner.

Kept separate from the network client so the parsing is pure and unit-testable
with recorded payloads (the live API is geo-blocked from some regions).
"""

from __future__ import annotations

from .bybit_client import BybitClient
from .scanner import OptionQuote
from .strategy import InstrumentSpec


def _f(d: dict, key: str, default: float = 0.0) -> float:
    v = d.get(key, "")
    if v in ("", None):
        return default
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def parse_option_symbol(symbol: str) -> tuple[str, float, bool] | None:
    """`BTC-27JUN25-60000-C` -> ("BTC", 60000.0, is_call=True). None if unparseable."""
    parts = symbol.split("-")
    if len(parts) < 4:
        return None
    base = parts[0]
    try:
        strike = float(parts[2])
    except ValueError:
        return None
    opt_type = parts[3].upper()
    if opt_type not in ("C", "P"):
        return None
    return base, strike, opt_type == "C"


def build_instrument_specs(instruments: list[dict]) -> dict[str, InstrumentSpec]:
    specs: dict[str, InstrumentSpec] = {}
    for inst in instruments:
        sym = inst.get("symbol")
        if not sym:
            continue
        lot = inst.get("lotSizeFilter", {}) or {}
        price = inst.get("priceFilter", {}) or {}
        specs[sym] = InstrumentSpec(
            symbol=sym,
            qty_step=_f(lot, "qtyStep", _f(lot, "minOrderQty", 0.0)),
            min_qty=_f(lot, "minOrderQty", 0.0),
            tick_size=_f(price, "tickSize", 0.01),
        )
    return specs


def expiry_map(instruments: list[dict]) -> dict[str, int]:
    out: dict[str, int] = {}
    for inst in instruments:
        sym = inst.get("symbol")
        dt = inst.get("deliveryTime")
        if sym and dt not in (None, "", "0"):
            try:
                out[sym] = int(dt)
            except (TypeError, ValueError):
                pass
    return out


def build_option_quotes(
    tickers: list[dict], expiries: dict[str, int], base_coin: str
) -> list[OptionQuote]:
    """Merge option tickers with their expiry timestamps into OptionQuotes."""
    quotes: list[OptionQuote] = []
    for t in tickers:
        sym = t.get("symbol", "")
        parsed = parse_option_symbol(sym)
        if not parsed:
            continue
        base, strike, is_call = parsed
        if base != base_coin:
            continue
        expiry_ms = expiries.get(sym)
        if not expiry_ms:
            continue
        ask = _f(t, "ask1Price")
        if ask <= 0:
            continue  # nothing to buy
        ask_iv = _f(t, "ask1Iv")
        quotes.append(
            OptionQuote(
                symbol=sym,
                base_coin=base,
                expiry_ms=expiry_ms,
                strike=strike,
                is_call=is_call,
                forward=_f(t, "underlyingPrice"),
                bid=_f(t, "bid1Price"),
                bid_size=_f(t, "bid1Size"),
                ask=ask,
                ask_size=_f(t, "ask1Size"),
                mark_price=_f(t, "markPrice"),
                mark_iv=_f(t, "markIv"),
                ask_iv=ask_iv if ask_iv > 0 else None,
                delta=_f(t, "delta", None) if t.get("delta") not in (None, "") else None,
                gamma=_f(t, "gamma", None) if t.get("gamma") not in (None, "") else None,
                vega=_f(t, "vega", None) if t.get("vega") not in (None, "") else None,
                theta=_f(t, "theta", None) if t.get("theta") not in (None, "") else None,
                open_interest=_f(t, "openInterest"),
                volume_24h=_f(t, "volume24h"),
            )
        )
    return quotes


def fetch_option_chain(
    client: BybitClient, base_coin: str
) -> tuple[list[OptionQuote], dict[str, InstrumentSpec]]:
    """Pull instruments + tickers for one base coin and return quotes + specs."""
    instruments = client.get_instruments("option", base_coin=base_coin)
    tickers = client.get_tickers("option", base_coin=base_coin)
    expiries = expiry_map(instruments)
    specs = build_instrument_specs(instruments)
    quotes = build_option_quotes(tickers, expiries, base_coin)
    return quotes, specs


def fetch_perp_spec(client: BybitClient, perp_symbol: str) -> InstrumentSpec | None:
    instruments = client.get_instruments("linear", symbol=perp_symbol)
    specs = build_instrument_specs(instruments)
    return specs.get(perp_symbol)
