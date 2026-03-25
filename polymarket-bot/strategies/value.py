"""Value strategy: find mispricings where market price diverges from estimated fair value.

This is a fundamental analysis approach — you bring your own fair value estimate
(e.g. from a model, news analysis, or polling data) and the strategy trades
when the market deviates significantly from that estimate.
"""

import logging
import math
from dataclasses import dataclass, field

from api_client import Market, OrderBook
from .base import Signal, Side, Strategy

logger = logging.getLogger(__name__)


@dataclass
class ValueStrategy(Strategy):
    """
    Trade when market price diverges from estimated fair value.

    Fair value can come from:
    - External model / polling aggregation
    - Manual override per market
    - Simple heuristics (volume-weighted sentiment)
    """

    name: str = "value"
    min_edge: float = 0.05  # minimum edge to trade (5%)
    kelly_fraction: float = 0.25  # fraction of full Kelly to use
    max_size_usdc: float = 50.0
    fair_values: dict[str, float] = field(default_factory=dict)

    def set_fair_value(self, condition_id: str, fair_value: float):
        """Manually set a fair value for a specific market."""
        self.fair_values[condition_id] = max(0.01, min(0.99, fair_value))

    def _estimate_fair_value(self, market: Market, orderbook: OrderBook) -> float:
        """
        Estimate fair value from order book and market data.
        This is a simple heuristic — replace with your own model for better results.
        """
        # If we have a manual override, use it
        if market.condition_id in self.fair_values:
            return self.fair_values[market.condition_id]

        # Heuristic: volume-weighted midpoint with bid/ask depth adjustment
        mid = orderbook.mid_price
        bid_depth = orderbook.bid_depth(5)
        ask_depth = orderbook.ask_depth(5)

        if bid_depth + ask_depth == 0:
            return mid

        # If there's more bid depth, fair value is slightly higher than mid
        depth_ratio = bid_depth / (bid_depth + ask_depth)
        adjustment = (depth_ratio - 0.5) * 0.04  # max ±2% adjustment
        fair = mid + adjustment

        return max(0.01, min(0.99, fair))

    def _kelly_size(self, edge: float, price: float, bankroll: float) -> float:
        """Calculate Kelly criterion position size."""
        if edge <= 0 or price <= 0 or price >= 1:
            return 0.0

        # Binary outcome Kelly: f = (p * b - q) / b
        # where p = fair_value, b = (1/price - 1), q = 1 - p
        p = price + edge  # our estimated probability
        b = (1.0 / price) - 1.0  # odds
        q = 1.0 - p

        if b <= 0:
            return 0.0

        kelly = (p * b - q) / b
        kelly = max(0.0, kelly)

        # Apply fraction and cap
        size = bankroll * kelly * self.kelly_fraction
        return min(size, self.max_size_usdc)

    def analyze(self, market: Market, orderbook: OrderBook) -> Signal | None:
        if not market.active or market.closed:
            return None

        fair_value = self._estimate_fair_value(market, orderbook)
        market_price = market.yes_price

        if market_price <= 0.01 or market_price >= 0.99:
            return None  # Skip extreme prices

        edge = fair_value - market_price

        if abs(edge) < self.min_edge:
            return None  # Not enough edge

        # Determine direction
        if edge > 0:
            side = Side.BUY_YES
            confidence = min(abs(edge) / 0.15, 1.0)
        else:
            side = Side.BUY_NO
            confidence = min(abs(edge) / 0.15, 1.0)

        size = self._kelly_size(abs(edge), market_price, self.max_size_usdc * 4)

        if size < 1.0:
            return None

        return Signal(
            market=market,
            side=side,
            confidence=confidence,
            edge=edge,
            fair_value=fair_value,
            size_usdc=size,
            reason=(
                f"Fair value {fair_value:.3f} vs market {market_price:.3f} "
                f"(edge={edge:+.3f}, Kelly size=${size:.2f})"
            ),
            strategy_name=self.name,
        )

    def should_exit(self, market: Market, entry_price: float, current_price: float) -> bool:
        fair_value = self._estimate_fair_value(market, OrderBook([], [], market, 0))
        remaining_edge = fair_value - current_price
        # Exit if edge has been captured or reversed
        return abs(remaining_edge) < 0.01 or (remaining_edge < 0 and entry_price < current_price)
