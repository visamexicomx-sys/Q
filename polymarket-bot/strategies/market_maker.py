"""Market maker strategy: provide liquidity by quoting both sides of the book.

Profits from the bid-ask spread. Works best on liquid markets with
stable prices. Requires careful inventory management.
"""

import logging
from dataclasses import dataclass

from api_client import Market, OrderBook
from .base import Signal, Side, Strategy

logger = logging.getLogger(__name__)


@dataclass
class MarketMakerStrategy(Strategy):
    name: str = "market_maker"
    min_spread: float = 0.03  # minimum spread to quote (3%)
    quote_offset: float = 0.01  # offset from midpoint
    max_size_usdc: float = 20.0
    min_liquidity: float = 2000.0
    max_inventory_imbalance: float = 0.7  # max ratio on one side

    # Track inventory per market
    _inventory: dict[str, float] = None

    def __post_init__(self):
        if self._inventory is None:
            self._inventory = {}

    def _get_inventory_skew(self, condition_id: str) -> float:
        """Returns inventory skew: positive = long YES, negative = long NO."""
        return self._inventory.get(condition_id, 0.0)

    def update_inventory(self, condition_id: str, delta: float):
        """Update inventory after a fill. Positive = bought YES, negative = sold YES."""
        current = self._inventory.get(condition_id, 0.0)
        self._inventory[condition_id] = current + delta

    def analyze(self, market: Market, orderbook: OrderBook) -> Signal | None:
        if not market.active or market.closed:
            return None

        if market.liquidity < self.min_liquidity:
            return None

        spread = orderbook.spread
        if spread < self.min_spread:
            return None  # Spread too tight to profitably make

        mid = orderbook.mid_price
        skew = self._get_inventory_skew(market.condition_id)

        # Adjust quotes based on inventory: if long YES, prefer to sell YES
        skew_adjustment = skew * 0.005  # small adjustment per unit of inventory

        bid_price = mid - self.quote_offset - skew_adjustment
        ask_price = mid + self.quote_offset - skew_adjustment

        # Clamp prices
        bid_price = max(0.01, min(0.98, bid_price))
        ask_price = max(0.02, min(0.99, ask_price))

        if bid_price >= ask_price:
            return None

        # For simplicity, return the more attractive side as a signal
        # In production, you'd post both sides simultaneously
        bid_edge = mid - bid_price
        ask_edge = ask_price - mid

        if bid_edge >= ask_edge and skew < self.max_inventory_imbalance:
            side = Side.BUY_YES
            price = bid_price
            edge = bid_edge
        elif skew > -self.max_inventory_imbalance:
            side = Side.SELL_YES
            price = ask_price
            edge = ask_edge
        else:
            return None  # Inventory limits reached

        confidence = min(spread / 0.08, 1.0)  # More confident with wider spreads
        size = self.max_size_usdc * confidence * 0.5

        return Signal(
            market=market,
            side=side,
            confidence=confidence,
            edge=edge,
            fair_value=mid,
            size_usdc=size,
            reason=(
                f"MM spread={spread:.4f} mid={mid:.4f} "
                f"bid={bid_price:.4f} ask={ask_price:.4f} skew={skew:.2f}"
            ),
            strategy_name=self.name,
        )

    def should_exit(self, market: Market, entry_price: float, current_price: float) -> bool:
        # Market makers don't typically "exit" — they flatten inventory gradually
        skew = self._get_inventory_skew(market.condition_id)
        return abs(skew) > self.max_inventory_imbalance * 1.5
