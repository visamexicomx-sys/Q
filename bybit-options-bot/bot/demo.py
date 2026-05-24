"""Synthetic option chain for offline end-to-end verification.

The live Bybit API is geo-blocked from some regions, so `--demo` feeds a
hand-built chain (with planted anomalies) through the real
scanner -> strategy -> risk -> executor pipeline in dry-run. It proves the
wiring without touching the network or any funds.
"""

from __future__ import annotations

import math
import time

from .pricing import black76_price
from .scanner import OptionQuote
from .strategy import InstrumentSpec

_NOW = int(time.time() * 1000)
_EXPIRY = _NOW + int(30 * 24 * 3600 * 1000)

# forward, perp symbol, option qty step, perp qty step
_UNDERLYINGS = {
    "BTC": (100_000.0, "BTCUSDT", 0.01, 0.001),
    "ETH": (3_500.0, "ETHUSDT", 0.1, 0.01),
    "SOL": (180.0, "SOLUSDT", 1.0, 0.1),
}


def _smile_iv(strike: float, forward: float) -> float:
    k = math.log(strike / forward)
    return 0.60 + 0.9 * k * k


def _quote(base, forward, strike, is_call, ask_iv, qty_step, ask_size=5.0):
    mark_iv = _smile_iv(strike, forward)
    t = 30 / 365
    mark_price = black76_price(forward, strike, mark_iv, t, is_call)
    ask = black76_price(forward, strike, ask_iv, t, is_call)
    sym = f"{base}-DEMO-{int(strike)}-{'C' if is_call else 'P'}"
    return sym, OptionQuote(
        symbol=sym,
        base_coin=base,
        expiry_ms=_EXPIRY,
        strike=float(strike),
        is_call=is_call,
        forward=forward,
        bid=ask * 0.97,
        bid_size=ask_size,
        ask=ask,
        ask_size=ask_size,
        mark_price=mark_price,
        mark_iv=mark_iv,
        ask_iv=None,
        delta=None,
        open_interest=250.0,
    )


def demo_chain(base_coin: str):
    """Return (quotes, specs) for one underlying, with one planted cheap option."""
    if base_coin not in _UNDERLYINGS:
        return [], {}
    forward, _perp, qty_step, _perp_step = _UNDERLYINGS[base_coin]
    quotes = []
    specs: dict[str, InstrumentSpec] = {}

    # Fair smile across +/-20% strikes.
    strikes = [round(forward * m / qty_step) * qty_step for m in
               (0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20)]
    for strike in strikes:
        is_call = strike >= forward
        sym, q = _quote(base_coin, forward, strike, is_call,
                        _smile_iv(strike, forward), qty_step)
        quotes.append(q)
        specs[sym] = InstrumentSpec(sym, qty_step=qty_step, min_qty=qty_step, tick_size=0.05)

    # Planted anomaly: 105% call priced 12 vol points cheap.
    cheap_strike = round(forward * 1.05 / qty_step) * qty_step
    sym, q = _quote(base_coin, forward, cheap_strike, True,
                    _smile_iv(cheap_strike, forward) - 0.12, qty_step)
    quotes.append(q)
    specs[sym] = InstrumentSpec(sym, qty_step=qty_step, min_qty=qty_step, tick_size=0.05)

    return quotes, specs


def demo_perp_spec(base_coin: str) -> InstrumentSpec | None:
    if base_coin not in _UNDERLYINGS:
        return None
    _f, perp, _qs, perp_step = _UNDERLYINGS[base_coin]
    return InstrumentSpec(perp, qty_step=perp_step, min_qty=perp_step, tick_size=0.1)
