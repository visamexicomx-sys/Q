"""Lightweight JSON state persistence: risk budget + signal de-duplication.

Persisting risk state across restarts means open premium and the daily-loss
counter survive a crash/restart, so limits can't be reset just by bouncing the
process. The daily P&L resets on a new UTC day.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone

from .risk import RiskState


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def load_state(path: str) -> tuple[RiskState, set[str]]:
    """Return (risk_state, seen_signal_keys). Resets daily P&L on a new day."""
    if not path or not os.path.exists(path):
        return RiskState(), set()
    try:
        with open(path) as fh:
            data = json.load(fh)
    except (json.JSONDecodeError, OSError):
        return RiskState(), set()

    rs = data.get("risk", {})
    state = RiskState(
        open_premium=rs.get("open_premium", 0.0),
        open_positions=rs.get("open_positions", 0),
        positions_per_underlying=rs.get("positions_per_underlying", {}) or {},
        realized_pnl_today=rs.get("realized_pnl_today", 0.0),
    )
    if data.get("day") != _today():
        state.realized_pnl_today = 0.0
    seen = set(data.get("seen", []))
    return state, seen


def save_state(path: str, state: RiskState, seen: set[str], max_seen: int = 5000) -> None:
    if not path:
        return
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    seen_list = list(seen)[-max_seen:]
    data = {
        "day": _today(),
        "risk": {
            "open_premium": state.open_premium,
            "open_positions": state.open_positions,
            "positions_per_underlying": state.positions_per_underlying,
            "realized_pnl_today": state.realized_pnl_today,
        },
        "seen": seen_list,
    }
    tmp = path + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(data, fh, indent=2)
    os.replace(tmp, path)
