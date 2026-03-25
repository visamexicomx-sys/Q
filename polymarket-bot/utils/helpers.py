"""Utility helpers for the trading bot."""

from datetime import datetime, timezone


def format_usdc(amount: float) -> str:
    return f"${amount:,.2f}"


def format_price(price: float) -> str:
    return f"{price:.4f}"


def format_pct(value: float) -> str:
    return f"{value:+.2%}"


def time_until(iso_date: str) -> str:
    """Human-readable time until a date."""
    try:
        target = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        delta = target - now
        if delta.days > 30:
            return f"{delta.days // 30}mo"
        elif delta.days > 0:
            return f"{delta.days}d"
        elif delta.seconds > 3600:
            return f"{delta.seconds // 3600}h"
        else:
            return f"{delta.seconds // 60}m"
    except (ValueError, TypeError):
        return "?"


def truncate(text: str, length: int = 60) -> str:
    return text[:length] + "..." if len(text) > length else text
