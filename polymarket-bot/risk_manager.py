"""Risk management module — position sizing, exposure limits, and stop-losses.

This is the safety layer between strategies and order execution.
All signals must pass through the risk manager before becoming orders.
"""

import logging
import time
from dataclasses import dataclass, field

from config import BotConfig
from strategies.base import Signal, Side

logger = logging.getLogger(__name__)


@dataclass
class Position:
    market_id: str
    token_id: str
    side: str
    entry_price: float
    size_usdc: float
    timestamp: float
    strategy: str
    pnl: float = 0.0

    @property
    def age_minutes(self) -> float:
        return (time.time() - self.timestamp) / 60


@dataclass
class RiskManager:
    config: BotConfig
    positions: dict[str, Position] = field(default_factory=dict)
    trade_history: list[dict] = field(default_factory=list)

    # Daily tracking
    _daily_pnl: float = 0.0
    _daily_trades: int = 0
    _daily_volume: float = 0.0
    _last_reset: float = field(default_factory=time.time)

    # Circuit breakers
    max_daily_loss: float = -100.0  # stop trading after $100 daily loss
    max_daily_trades: int = 50
    max_concurrent_positions: int = 10
    max_single_market_exposure: float = 0.3  # 30% of total exposure in one market
    cooldown_after_loss_seconds: int = 300  # 5 min cooldown after a loss

    _last_loss_time: float = 0.0

    def _check_daily_reset(self):
        """Reset daily counters every 24 hours."""
        if time.time() - self._last_reset > 86400:
            logger.info(
                f"Daily reset — PnL: ${self._daily_pnl:.2f}, "
                f"Trades: {self._daily_trades}, Volume: ${self._daily_volume:.2f}"
            )
            self._daily_pnl = 0.0
            self._daily_trades = 0
            self._daily_volume = 0.0
            self._last_reset = time.time()

    @property
    def total_exposure(self) -> float:
        return sum(p.size_usdc for p in self.positions.values())

    @property
    def available_capital(self) -> float:
        return self.config.max_total_exposure_usdc - self.total_exposure

    def market_exposure(self, market_id: str) -> float:
        return sum(
            p.size_usdc for p in self.positions.values() if p.market_id == market_id
        )

    # ── Pre-trade checks ─────────────────────────────────────────────

    def check_signal(self, signal: Signal) -> tuple[bool, str, float]:
        """
        Validate a signal against risk limits.
        Returns (approved, reason, adjusted_size).
        """
        self._check_daily_reset()

        # Circuit breaker: daily loss limit
        if self._daily_pnl <= self.max_daily_loss:
            return False, f"Daily loss limit reached (${self._daily_pnl:.2f})", 0.0

        # Circuit breaker: trade count
        if self._daily_trades >= self.max_daily_trades:
            return False, f"Daily trade limit reached ({self._daily_trades})", 0.0

        # Cooldown after loss
        if time.time() - self._last_loss_time < self.cooldown_after_loss_seconds:
            remaining = self.cooldown_after_loss_seconds - (time.time() - self._last_loss_time)
            return False, f"Loss cooldown active ({remaining:.0f}s remaining)", 0.0

        # Max concurrent positions
        if (
            len(self.positions) >= self.max_concurrent_positions
            and signal.market.condition_id not in self.positions
        ):
            return False, f"Max positions reached ({len(self.positions)})", 0.0

        # Total exposure limit
        if self.total_exposure >= self.config.max_total_exposure_usdc:
            return False, f"Max exposure reached (${self.total_exposure:.2f})", 0.0

        # Single market exposure
        market_exp = self.market_exposure(signal.market.condition_id)
        max_market = self.config.max_total_exposure_usdc * self.max_single_market_exposure
        if market_exp >= max_market:
            return False, f"Market exposure limit (${market_exp:.2f}/${max_market:.2f})", 0.0

        # Minimum edge
        if abs(signal.edge) < self.config.min_edge_threshold:
            return False, f"Edge too small ({signal.edge:.4f})", 0.0

        # Confidence check
        if signal.confidence < 0.4:
            return False, f"Confidence too low ({signal.confidence:.2f})", 0.0

        # Size adjustment
        size = signal.size_usdc
        size = min(size, self.config.max_position_size_usdc)
        size = min(size, self.available_capital)
        size = min(size, max_market - market_exp)
        size = min(size, self.config.order_size_usdc)

        if size < 1.0:
            return False, "Adjusted size too small", 0.0

        return True, "Approved", size

    # ── Position tracking ─────────────────────────────────────────────

    def open_position(self, signal: Signal, size_usdc: float, token_id: str):
        """Record a new position."""
        pos = Position(
            market_id=signal.market.condition_id,
            token_id=token_id,
            side=signal.side.value,
            entry_price=signal.fair_value,
            size_usdc=size_usdc,
            timestamp=time.time(),
            strategy=signal.strategy_name,
        )
        self.positions[signal.market.condition_id] = pos
        self._daily_trades += 1
        self._daily_volume += size_usdc

        logger.info(
            f"Position opened: {signal.side.value} ${size_usdc:.2f} on "
            f"'{signal.market.question[:50]}' via {signal.strategy_name}"
        )

    def close_position(self, market_id: str, exit_price: float):
        """Close a position and record PnL."""
        pos = self.positions.pop(market_id, None)
        if not pos:
            return

        if pos.side in ("BUY_YES", "BUY_NO"):
            pnl = (exit_price - pos.entry_price) * pos.size_usdc
        else:
            pnl = (pos.entry_price - exit_price) * pos.size_usdc

        self._daily_pnl += pnl
        if pnl < 0:
            self._last_loss_time = time.time()

        self.trade_history.append({
            "market_id": market_id,
            "side": pos.side,
            "entry_price": pos.entry_price,
            "exit_price": exit_price,
            "size_usdc": pos.size_usdc,
            "pnl": pnl,
            "strategy": pos.strategy,
            "duration_min": pos.age_minutes,
        })

        logger.info(
            f"Position closed: {pos.side} ${pos.size_usdc:.2f} | "
            f"PnL: ${pnl:+.2f} | Duration: {pos.age_minutes:.1f}min"
        )

    # ── Reporting ─────────────────────────────────────────────────────

    def get_summary(self) -> dict:
        """Get current risk summary."""
        return {
            "total_exposure": self.total_exposure,
            "available_capital": self.available_capital,
            "open_positions": len(self.positions),
            "daily_pnl": self._daily_pnl,
            "daily_trades": self._daily_trades,
            "daily_volume": self._daily_volume,
            "positions": {
                k: {
                    "side": v.side,
                    "size": v.size_usdc,
                    "entry": v.entry_price,
                    "age_min": v.age_minutes,
                    "strategy": v.strategy,
                }
                for k, v in self.positions.items()
            },
        }
