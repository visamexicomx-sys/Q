"""Beta-neutral (delta-hedged) trade construction.

For a cheap-option signal we:
  * buy the option at (or just above) the ask, capped so we never pay above
    fair value minus a safety margin;
  * compute the position's delta exposure in coin terms and hedge it with the
    linear perpetual, leaving the book delta (≈ beta) neutral.

The residual position is long gamma/vega bought below fair value: it makes
money if the option re-prices toward fair, or if realised vol exceeds the cheap
implied we paid — independent of which way the underlying moves.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from .scanner import Signal


@dataclass
class InstrumentSpec:
    symbol: str
    qty_step: float
    min_qty: float
    tick_size: float = 0.01

    def round_qty(self, qty: float) -> float:
        if self.qty_step <= 0:
            return qty
        steps = math.floor(qty / self.qty_step + 1e-9)
        return round(steps * self.qty_step, 10)

    def round_price(self, price: float) -> float:
        if self.tick_size <= 0:
            return price
        steps = round(price / self.tick_size)
        return round(steps * self.tick_size, 10)


@dataclass
class OrderLeg:
    symbol: str
    side: str  # "Buy" | "Sell"
    qty: float
    price: float | None  # None => market order
    reduce_only: bool = False
    note: str = ""


@dataclass
class TradePlan:
    signal: Signal
    option_leg: OrderLeg
    hedge_leg: OrderLeg | None
    premium_usd: float  # cash paid for the option (qty * price)
    expected_edge_usd: float  # qty * per-contract edge
    net_delta_after_hedge: float  # residual coin delta (should be ~0)
    reject_reason: str | None = None


@dataclass
class StrategyConfig:
    max_premium_per_trade: float = 50.0  # USDC budget per option position
    max_contracts_per_trade: float = 10.0  # in coin units
    safety_margin: float = 0.02  # never pay above fair*(1 - margin)
    fill_buffer_ticks: int = 0  # add N ticks above ask to improve fill odds
    hedge_enabled: bool = True
    hedge_with_market: bool = True  # market-hedge for immediate neutrality
    min_hedge_qty_ratio: float = 0.5  # skip hedge if it rounds below half a step


def build_trade_plan(
    sig: Signal,
    option_spec: InstrumentSpec,
    cfg: StrategyConfig,
    perp_spec: InstrumentSpec | None = None,
) -> TradePlan:
    """Turn a signal into a concrete, risk-bounded delta-neutral trade plan."""
    # Price cap: we take the cheap ask, but never above fair*(1 - safety_margin).
    max_pay = sig.fair_price * (1.0 - cfg.safety_margin)
    limit_price = sig.ask + cfg.fill_buffer_ticks * option_spec.tick_size
    if limit_price > max_pay:
        # If even the ask is above our cap, the edge isn't real enough.
        if sig.ask > max_pay:
            return _reject(sig, "ask above fair*(1-margin); edge too thin")
        limit_price = max_pay
    limit_price = option_spec.round_price(limit_price)
    if limit_price <= 0:
        return _reject(sig, "non-positive limit price")

    # Size by the smaller of: premium budget, contract cap, resting ask size.
    qty_by_budget = cfg.max_premium_per_trade / limit_price if limit_price > 0 else 0.0
    qty = min(qty_by_budget, cfg.max_contracts_per_trade)
    if sig.ask_size > 0:
        qty = min(qty, sig.ask_size)
    qty = option_spec.round_qty(qty)

    if qty < option_spec.min_qty or qty <= 0:
        return _reject(
            sig,
            f"sized qty {qty:g} below min {option_spec.min_qty:g} "
            f"(budget {cfg.max_premium_per_trade:g} USDC at {limit_price:g})",
        )

    premium_usd = qty * limit_price
    expected_edge_usd = qty * sig.edge_usd

    option_leg = OrderLeg(
        symbol=sig.symbol,
        side="Buy",
        qty=qty,
        price=limit_price,
        reduce_only=False,
        note=f"buy cheap {sig.kind}",
    )

    hedge_leg = None
    net_delta = sig.delta * qty
    if cfg.hedge_enabled and perp_spec is not None and abs(sig.delta) > 0:
        hedge_qty_raw = abs(net_delta)
        hedge_qty = perp_spec.round_qty(hedge_qty_raw)
        if hedge_qty >= max(perp_spec.min_qty, cfg.min_hedge_qty_ratio * perp_spec.qty_step):
            # Long option delta (+) => sell perp to neutralise, and vice-versa.
            hedge_side = "Sell" if net_delta > 0 else "Buy"
            hedge_leg = OrderLeg(
                symbol=perp_spec.symbol,
                side=hedge_side,
                qty=hedge_qty,
                price=None if cfg.hedge_with_market else None,
                reduce_only=False,
                note="delta hedge",
            )
            signed_hedge = -hedge_qty if hedge_side == "Sell" else hedge_qty
            net_delta = net_delta + signed_hedge

    return TradePlan(
        signal=sig,
        option_leg=option_leg,
        hedge_leg=hedge_leg,
        premium_usd=premium_usd,
        expected_edge_usd=expected_edge_usd,
        net_delta_after_hedge=net_delta,
    )


def _reject(sig: Signal, reason: str) -> TradePlan:
    return TradePlan(
        signal=sig,
        option_leg=OrderLeg(sig.symbol, "Buy", 0.0, None),
        hedge_leg=None,
        premium_usd=0.0,
        expected_edge_usd=0.0,
        net_delta_after_hedge=0.0,
        reject_reason=reason,
    )
