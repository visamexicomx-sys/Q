"""Arbitrage strategy: exploit mispricings between YES and NO tokens.

In a binary market, YES + NO should sum to ~1.00. When they don't,
there's a risk-free arbitrage opportunity (minus fees).
"""

import logging
from dataclasses import dataclass

from api_client import Market, OrderBook
from .base import Signal, Side, Strategy

logger = logging.getLogger(__name__)

POLY_FEE_RATE = 0.02  # Polymarket takes ~2% on winnings


@dataclass
class ArbitrageStrategy(Strategy):
    name: str = "arbitrage"
    min_arb_edge: float = 0.02  # minimum edge after fees
    max_size_usdc: float = 100.0

    def analyze(self, market: Market, orderbook: OrderBook) -> Signal | None:
        if not market.active or market.closed:
            return None

        yes_price = market.yes_price
        no_price = market.no_price

        if yes_price <= 0 or no_price <= 0:
            return None

        total = yes_price + no_price

        # Case 1: YES + NO < 1.0 → buy both, guaranteed $1 payout
        if total < 1.0:
            gross_edge = 1.0 - total
            net_edge = gross_edge - POLY_FEE_RATE
            if net_edge > self.min_arb_edge:
                size = min(self.max_size_usdc, self.max_size_usdc * net_edge * 10)
                return Signal(
                    market=market,
                    side=Side.BUY_YES,  # Buy both sides
                    confidence=min(net_edge / 0.05, 1.0),
                    edge=net_edge,
                    fair_value=0.5,
                    size_usdc=size,
                    reason=(
                        f"ARB: YES({yes_price:.3f}) + NO({no_price:.3f}) = {total:.3f} < 1.0 | "
                        f"net edge={net_edge:.4f}"
                    ),
                    strategy_name=self.name,
                )

        # Case 2: YES + NO > 1.0 → sell both (if you hold both)
        if total > 1.0:
            gross_edge = total - 1.0
            net_edge = gross_edge - POLY_FEE_RATE
            if net_edge > self.min_arb_edge:
                size = min(self.max_size_usdc, self.max_size_usdc * net_edge * 10)
                return Signal(
                    market=market,
                    side=Side.SELL_YES,  # Sell both sides
                    confidence=min(net_edge / 0.05, 1.0),
                    edge=net_edge,
                    fair_value=0.5,
                    size_usdc=size,
                    reason=(
                        f"ARB: YES({yes_price:.3f}) + NO({no_price:.3f}) = {total:.3f} > 1.0 | "
                        f"net edge={net_edge:.4f}"
                    ),
                    strategy_name=self.name,
                )

        return None

    def should_exit(self, market: Market, entry_price: float, current_price: float) -> bool:
        # Arb positions are held to resolution
        return market.closed
