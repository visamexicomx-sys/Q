"""Model-free structural arbitrage detectors (alert-only, multi-leg).

These need no pricing model — they exploit relationships that must hold between
executable quotes or a riskless profit exists:

  * PARITY_ARB    — put-call parity vs the forward (3 legs incl. a perp hedge)
  * VERTICAL_ARB  — call price must fall, put price must rise, with strike
  * BUTTERFLY_ARB — option prices must be convex in strike

They are flagged for alerting only: executing them safely needs all legs filled
together (leg risk), which the single-leg executor does not do. Use them as
high-signal manual opportunities.
"""

from __future__ import annotations

import math

from .scanner import OptionQuote, ScanConfig, Signal


def _alert(
    kind: str, q: OptionQuote, days: float, edge: float, legs: str
) -> Signal:
    return Signal(
        kind=kind,
        symbol=f"{q.base_coin}-{kind}",
        base_coin=q.base_coin,
        is_call=q.is_call,
        strike=q.strike,
        expiry_ms=q.expiry_ms,
        days_to_expiry=days,
        forward=q.forward,
        ask=q.ask,
        ask_size=q.ask_size,
        fair_price=q.ask + edge,
        fair_iv=0.0,
        ask_iv=0.0,
        edge_usd=edge,
        edge_pct=0.0,
        vol_edge=0.0,
        resid_sigma=999.0,
        delta=0.0,
        gamma=0.0,
        vega=0.0,
        score=1e6 + edge,  # model-free arbs rank at the top
        notes=legs,
        tradeable=False,
        legs=legs,
    )


def _valid(q: OptionQuote) -> bool:
    return q.bid > 0 and q.ask > 0 and q.ask >= q.bid


def detect_structural(group: list[OptionQuote], t: float, days: float, cfg: ScanConfig) -> list[Signal]:
    if not group:
        return []
    forward = group[0].forward
    if forward <= 0:
        return []
    df = math.exp(-cfg.risk_free_rate * t)
    perp_fee = cfg.perp_fee_rate * forward

    calls = {q.strike: q for q in group if q.is_call and _valid(q)}
    puts = {q.strike: q for q in group if not q.is_call and _valid(q)}
    out: list[Signal] = []

    # --- Put-call parity: C - P should equal df*(F - K) ---
    for strike in set(calls) & set(puts):
        c, p = calls[strike], puts[strike]
        opt_fee = cfg.fee_rate * (c.ask + c.bid + p.ask + p.bid) / 2.0
        # Synthetic long (buy call, sell put) hedged short perp.
        edge_long = df * (forward - strike) - (c.ask - p.bid) - opt_fee - perp_fee
        if edge_long > cfg.min_arb_edge_usd:
            out.append(_alert("PARITY_ARB", c, days, edge_long,
                              f"buy {strike:g}C @{c.ask:g} / sell {strike:g}P @{p.bid:g} / short perp"))
        # Synthetic short (buy put, sell call) hedged long perp.
        edge_short = df * (strike - forward) - (p.ask - c.bid) - opt_fee - perp_fee
        if edge_short > cfg.min_arb_edge_usd:
            out.append(_alert("PARITY_ARB", p, days, edge_short,
                              f"buy {strike:g}P @{p.ask:g} / sell {strike:g}C @{c.bid:g} / long perp"))

    # --- Vertical monotonicity (adjacent strikes) ---
    out.extend(_vertical(calls, is_call=True, days=days, cfg=cfg))
    out.extend(_vertical(puts, is_call=False, days=days, cfg=cfg))

    # --- Butterfly convexity (equally spaced call triples) ---
    out.extend(_butterfly(calls, days=days, cfg=cfg))
    return out


def _vertical(book: dict[float, OptionQuote], is_call: bool, days: float, cfg: ScanConfig) -> list[Signal]:
    out: list[Signal] = []
    strikes = sorted(book)
    for lo, hi in zip(strikes, strikes[1:]):
        c_lo, c_hi = book[lo], book[hi]
        fee = cfg.fee_rate * (c_lo.ask + c_hi.bid)
        if is_call:
            # Calls must be non-increasing in strike: a higher-strike bid above a
            # lower-strike ask is a credit on a non-negative bull spread.
            credit = c_hi.bid - c_lo.ask
            legs = f"buy {lo:g}C @{c_lo.ask:g} / sell {hi:g}C @{c_hi.bid:g}"
            cheap = c_lo
        else:
            # Puts must be non-decreasing in strike.
            credit = book[lo].bid - book[hi].ask
            fee = cfg.fee_rate * (book[hi].ask + book[lo].bid)
            legs = f"buy {hi:g}P @{book[hi].ask:g} / sell {lo:g}P @{book[lo].bid:g}"
            cheap = book[hi]
        edge = credit - fee
        if edge > cfg.min_arb_edge_usd:
            out.append(_alert("VERTICAL_ARB", cheap, days, edge, legs))
    return out


def _butterfly(calls: dict[float, OptionQuote], days: float, cfg: ScanConfig) -> list[Signal]:
    out: list[Signal] = []
    strikes = sorted(calls)
    for i in range(len(strikes) - 2):
        k1, k2, k3 = strikes[i], strikes[i + 1], strikes[i + 2]
        # Require (near) equal spacing for a standard butterfly.
        if abs((k2 - k1) - (k3 - k2)) > 1e-6 * max(1.0, k2):
            continue
        a1, b2, a3 = calls[k1].ask, calls[k2].bid, calls[k3].ask
        cost = a1 - 2 * b2 + a3  # long butterfly debit; must be >= 0 normally
        fee = cfg.fee_rate * (a1 + 2 * b2 + a3)
        edge = -cost - fee
        if edge > cfg.min_arb_edge_usd:
            legs = f"buy {k1:g}C @{a1:g} / sell 2x {k2:g}C @{b2:g} / buy {k3:g}C @{a3:g}"
            out.append(_alert("BUTTERFLY_ARB", calls[k2], days, edge, legs))
    return out
