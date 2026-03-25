"""Momentum strategy: trade in the direction of recent price movement.

Tracks price history and enters when momentum signals are strong.
Works best on trending markets with high volume.
"""

import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field

from api_client import Market, OrderBook
from .base import Signal, Side, Strategy

logger = logging.getLogger(__name__)


@dataclass
class PriceSnapshot:
    price: float
    volume: float
    timestamp: float


@dataclass
class MomentumStrategy(Strategy):
    name: str = "momentum"
    lookback_minutes: int = 30
    min_price_change: float = 0.03  # 3% move to trigger
    min_volume: float = 1000.0
    max_size_usdc: float = 30.0
    momentum_decay: float = 0.9  # weight decay for older observations

    # Internal state
    _price_history: dict[str, list[PriceSnapshot]] = field(
        default_factory=lambda: defaultdict(list)
    )

    def _record_price(self, market: Market, orderbook: OrderBook):
        """Record a new price observation."""
        snap = PriceSnapshot(
            price=orderbook.mid_price,
            volume=market.volume,
            timestamp=time.time(),
        )
        history = self._price_history[market.condition_id]
        history.append(snap)

        # Trim old data
        cutoff = time.time() - (self.lookback_minutes * 60 * 2)
        self._price_history[market.condition_id] = [
            s for s in history if s.timestamp > cutoff
        ]

    def _compute_momentum(self, condition_id: str) -> float | None:
        """Compute weighted momentum score. Positive = bullish, negative = bearish."""
        history = self._price_history.get(condition_id, [])
        cutoff = time.time() - (self.lookback_minutes * 60)
        recent = [s for s in history if s.timestamp > cutoff]

        if len(recent) < 3:
            return None  # Not enough data

        # Weighted price change
        total_weight = 0.0
        weighted_change = 0.0

        for i in range(1, len(recent)):
            age_factor = self.momentum_decay ** (len(recent) - i)
            change = recent[i].price - recent[i - 1].price
            weighted_change += change * age_factor
            total_weight += age_factor

        if total_weight == 0:
            return None

        return weighted_change / total_weight

    def analyze(self, market: Market, orderbook: OrderBook) -> Signal | None:
        if not market.active or market.closed:
            return None

        self._record_price(market, orderbook)

        if market.volume < self.min_volume:
            return None

        momentum = self._compute_momentum(market.condition_id)
        if momentum is None:
            return None

        if abs(momentum) < self.min_price_change:
            return None

        # Trade in direction of momentum
        if momentum > 0:
            side = Side.BUY_YES
            confidence = min(momentum / 0.10, 1.0)
        else:
            side = Side.BUY_NO
            confidence = min(abs(momentum) / 0.10, 1.0)

        size = self.max_size_usdc * confidence * 0.5

        if size < 1.0:
            return None

        return Signal(
            market=market,
            side=side,
            confidence=confidence,
            edge=abs(momentum),
            fair_value=orderbook.mid_price + momentum,
            size_usdc=size,
            reason=f"Momentum={momentum:+.4f} over {self.lookback_minutes}min",
            strategy_name=self.name,
        )

    def should_exit(self, market: Market, entry_price: float, current_price: float) -> bool:
        momentum = self._compute_momentum(market.condition_id)
        if momentum is None:
            return False

        # Exit if momentum reversed
        was_long = entry_price < current_price
        if was_long and momentum < -0.01:
            return True
        if not was_long and momentum > 0.01:
            return True

        return False
