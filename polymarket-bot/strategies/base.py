"""Base strategy interface and signal types."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum

from api_client import Market, OrderBook


class Side(Enum):
    BUY_YES = "BUY_YES"
    BUY_NO = "BUY_NO"
    SELL_YES = "SELL_YES"
    SELL_NO = "SELL_NO"
    HOLD = "HOLD"


@dataclass
class Signal:
    market: Market
    side: Side
    confidence: float  # 0.0 to 1.0
    edge: float  # expected edge (fair_price - market_price)
    fair_value: float  # estimated fair probability
    size_usdc: float  # suggested position size
    reason: str  # human-readable explanation
    strategy_name: str

    @property
    def is_actionable(self) -> bool:
        return self.side != Side.HOLD and self.confidence > 0.5 and abs(self.edge) > 0.02


class Strategy(ABC):
    """Base class for all trading strategies."""

    name: str = "base"

    @abstractmethod
    def analyze(self, market: Market, orderbook: OrderBook) -> Signal | None:
        """Analyze a market and return a trading signal, or None to skip."""
        ...

    @abstractmethod
    def should_exit(self, market: Market, entry_price: float, current_price: float) -> bool:
        """Whether to exit an existing position."""
        ...
