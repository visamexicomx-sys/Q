"""Profit & loss accounting.

Bybit is the source of truth: realised P&L comes from closed-PnL records and
unrealised from the live positions list. The pure aggregation functions are
unit-tested with recorded-shape payloads; the `build_report` orchestration is a
thin wrapper around the (geo-blocked) API.

The realised-since-midnight figure also feeds the risk manager's daily-loss
kill-switch, so the halt is grounded in actual booked P&L.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


def today_start_ms() -> int:
    now = datetime.now(timezone.utc)
    midnight = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    return int(midnight.timestamp() * 1000)


def _f(d: dict, key: str, default: float = 0.0) -> float:
    v = d.get(key, "")
    if v in ("", None):
        return default
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def summarize_closed_pnl(records: list[dict]) -> dict:
    """Aggregate /v5/position/closed-pnl rows -> {count, realized, by_symbol}."""
    total = 0.0
    by_symbol: dict[str, float] = {}
    for r in records:
        pnl = _f(r, "closedPnl")
        total += pnl
        sym = r.get("symbol", "?")
        by_symbol[sym] = by_symbol.get(sym, 0.0) + pnl
    return {"count": len(records), "realized": total, "by_symbol": by_symbol}


def summarize_positions(positions: list[dict]) -> dict:
    """Aggregate /v5/position/list rows -> {unrealized, open, by_symbol}."""
    total = 0.0
    open_count = 0
    by_symbol: dict[str, float] = {}
    for p in positions:
        size = _f(p, "size")
        if size == 0:
            continue
        open_count += 1
        upnl = _f(p, "unrealisedPnl")
        total += upnl
        sym = p.get("symbol", "?")
        by_symbol[sym] = by_symbol.get(sym, 0.0) + upnl
    return {"unrealized": total, "open": open_count, "by_symbol": by_symbol}


@dataclass
class PnLReport:
    realized_today: float = 0.0
    realized_all: float = 0.0
    unrealized: float = 0.0
    open_positions: int = 0
    closed_by_symbol: dict[str, float] = field(default_factory=dict)
    open_by_symbol: dict[str, float] = field(default_factory=dict)

    @property
    def net_today(self) -> float:
        return self.realized_today + self.unrealized


def build_report(client, categories: list[str]) -> PnLReport:
    """Pull closed-PnL (today + recent) and open positions across categories."""
    start = today_start_ms()
    report = PnLReport()
    for cat in categories:
        try:
            today = client.get_closed_pnl(cat, start_time=start, limit=100)
            allrec = client.get_closed_pnl(cat, limit=100)
            positions = client.get_positions(cat)
        except Exception:
            continue
        s_today = summarize_closed_pnl(today)
        s_all = summarize_closed_pnl(allrec)
        s_pos = summarize_positions(positions)
        report.realized_today += s_today["realized"]
        report.realized_all += s_all["realized"]
        report.unrealized += s_pos["unrealized"]
        report.open_positions += s_pos["open"]
        for sym, v in s_all["by_symbol"].items():
            report.closed_by_symbol[sym] = report.closed_by_symbol.get(sym, 0.0) + v
        for sym, v in s_pos["by_symbol"].items():
            report.open_by_symbol[sym] = report.open_by_symbol.get(sym, 0.0) + v
    return report


def format_report(report: PnLReport) -> str:
    lines = [
        "📊 P&L",
        f"Realized today: {report.realized_today:+.2f} USDC",
        f"Unrealized (open): {report.unrealized:+.2f} USDC",
        f"Net today: {report.net_today:+.2f} USDC",
        f"Realized (recent): {report.realized_all:+.2f} USDC",
        f"Open positions: {report.open_positions}",
    ]
    if report.open_by_symbol:
        lines.append("Open:")
        for sym, v in sorted(report.open_by_symbol.items(), key=lambda kv: kv[1]):
            lines.append(f"  {sym}: {v:+.2f}")
    return "\n".join(lines)
