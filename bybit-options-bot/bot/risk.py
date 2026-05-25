"""Risk gate.

Every trade plan must pass `RiskManager.check` before it can reach the
exchange. The gate is intentionally strict and fails closed: any breach, or a
present kill-switch file, blocks the trade. None of these limits are advisory.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from .strategy import TradePlan


@dataclass
class RiskConfig:
    max_premium_per_trade: float = 50.0  # USDC, single position
    max_total_premium: float = 300.0  # USDC, sum of open option premium
    max_open_positions: int = 8
    max_positions_per_underlying: int = 4
    max_daily_loss: float = 100.0  # USDC realised loss before halt
    min_edge_pct: float = 0.05  # final guard duplicated from scanner
    kill_switch_file: str = ".KILL"


@dataclass
class RiskState:
    open_premium: float = 0.0
    open_positions: int = 0
    positions_per_underlying: dict[str, int] = field(default_factory=dict)
    realized_pnl_today: float = 0.0


@dataclass
class RiskDecision:
    allowed: bool
    reason: str = ""


class RiskManager:
    def __init__(self, cfg: RiskConfig, state: RiskState | None = None):
        self.cfg = cfg
        self.state = state or RiskState()

    def kill_switch_active(self) -> bool:
        return os.path.exists(self.cfg.kill_switch_file)

    def halted(self) -> bool:
        if self.kill_switch_active():
            return True
        if self.state.realized_pnl_today <= -abs(self.cfg.max_daily_loss):
            return True
        return False

    def check(self, plan: TradePlan) -> RiskDecision:
        if plan.reject_reason:
            return RiskDecision(False, f"strategy rejected: {plan.reject_reason}")
        if self.kill_switch_active():
            return RiskDecision(False, f"kill-switch present ({self.cfg.kill_switch_file})")
        if self.state.realized_pnl_today <= -abs(self.cfg.max_daily_loss):
            return RiskDecision(
                False,
                f"daily loss limit hit ({self.state.realized_pnl_today:.2f} "
                f"<= -{self.cfg.max_daily_loss:.2f} USDC)",
            )

        sig = plan.signal
        if sig.edge_pct < self.cfg.min_edge_pct and sig.kind != "ARBITRAGE":
            return RiskDecision(False, f"edge {sig.edge_pct:.1%} below floor")

        if plan.premium_usd > self.cfg.max_premium_per_trade + 1e-9:
            return RiskDecision(
                False,
                f"premium {plan.premium_usd:.2f} > per-trade cap "
                f"{self.cfg.max_premium_per_trade:.2f}",
            )
        if self.state.open_premium + plan.premium_usd > self.cfg.max_total_premium + 1e-9:
            return RiskDecision(
                False,
                f"open premium {self.state.open_premium:.2f} + {plan.premium_usd:.2f} "
                f"> total cap {self.cfg.max_total_premium:.2f}",
            )
        if self.state.open_positions >= self.cfg.max_open_positions:
            return RiskDecision(
                False, f"open positions {self.state.open_positions} at cap"
            )
        per = self.state.positions_per_underlying.get(sig.base_coin, 0)
        if per >= self.cfg.max_positions_per_underlying:
            return RiskDecision(
                False,
                f"{sig.base_coin} positions {per} at per-underlying cap",
            )
        return RiskDecision(True, "ok")

    def register_fill(self, plan: TradePlan) -> None:
        """Record an accepted position against the live risk budget."""
        sig = plan.signal
        self.state.open_premium += plan.premium_usd
        self.state.open_positions += 1
        self.state.positions_per_underlying[sig.base_coin] = (
            self.state.positions_per_underlying.get(sig.base_coin, 0) + 1
        )

    def register_close(self, base_coin: str, premium: float, realized_pnl: float) -> None:
        self.state.open_premium = max(0.0, self.state.open_premium - premium)
        self.state.open_positions = max(0, self.state.open_positions - 1)
        if base_coin in self.state.positions_per_underlying:
            self.state.positions_per_underlying[base_coin] = max(
                0, self.state.positions_per_underlying[base_coin] - 1
            )
        self.state.realized_pnl_today += realized_pnl
