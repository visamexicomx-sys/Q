"""Metrics collection and tracking."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from ..platforms.base import PostMetrics, AccountMetrics


@dataclass
class DailySnapshot:
    """Daily metrics snapshot for a platform."""

    date: str
    platform: str
    followers: int = 0
    impressions: int = 0
    engagement: int = 0
    posts_published: int = 0
    engagement_rate: float = 0.0
    top_post_id: str = ""


class MetricsTracker:
    """Collects and stores metrics from all platforms."""

    def __init__(self, storage_path: str = "./data/metrics.json") -> None:
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.post_metrics: list[PostMetrics] = []
        self.account_snapshots: list[DailySnapshot] = []
        self._load()

    def record_post_metrics(self, metrics: PostMetrics) -> None:
        """Record metrics for a single post."""
        self.post_metrics.append(metrics)
        self._save()

    def record_daily_snapshot(self, snapshot: DailySnapshot) -> None:
        """Record a daily account snapshot."""
        self.account_snapshots.append(snapshot)
        self._save()

    def get_engagement_rate(
        self, platform: str, days: int = 7
    ) -> float:
        """Calculate average engagement rate over N days."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        relevant = [
            m for m in self.post_metrics
            if m.platform == platform
            and m.collected_at
            and m.collected_at >= cutoff
        ]

        if not relevant:
            return 0.0

        total_engagement = sum(
            m.likes + m.comments + m.shares + m.saves for m in relevant
        )
        total_impressions = sum(m.impressions for m in relevant)

        if total_impressions == 0:
            return 0.0
        return total_engagement / total_impressions

    def get_growth_rate(
        self, platform: str, days: int = 30
    ) -> float:
        """Calculate follower growth rate."""
        snapshots = [
            s for s in self.account_snapshots
            if s.platform == platform
        ]
        snapshots.sort(key=lambda s: s.date)

        if len(snapshots) < 2:
            return 0.0

        old = snapshots[0].followers
        new = snapshots[-1].followers

        if old == 0:
            return 0.0
        return (new - old) / old

    def get_top_posts(
        self,
        platform: str,
        metric: str = "engagement",
        limit: int = 10,
        days: int = 30,
    ) -> list[PostMetrics]:
        """Get top performing posts by a specific metric."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        relevant = [
            m for m in self.post_metrics
            if m.platform == platform
            and m.collected_at
            and m.collected_at >= cutoff
        ]

        def sort_key(m: PostMetrics) -> int:
            if metric == "engagement":
                return m.likes + m.comments + m.shares + m.saves
            elif metric == "impressions":
                return m.impressions
            elif metric == "likes":
                return m.likes
            elif metric == "comments":
                return m.comments
            elif metric == "shares":
                return m.shares
            return 0

        relevant.sort(key=sort_key, reverse=True)
        return relevant[:limit]

    def get_platform_summary(
        self, platform: str, days: int = 7
    ) -> dict[str, Any]:
        """Get a summary of platform performance."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        relevant = [
            m for m in self.post_metrics
            if m.platform == platform
            and m.collected_at
            and m.collected_at >= cutoff
        ]

        total_likes = sum(m.likes for m in relevant)
        total_comments = sum(m.comments for m in relevant)
        total_shares = sum(m.shares for m in relevant)
        total_impressions = sum(m.impressions for m in relevant)

        return {
            "platform": platform,
            "period_days": days,
            "total_posts": len(relevant),
            "total_impressions": total_impressions,
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_shares": total_shares,
            "avg_engagement_rate": self.get_engagement_rate(platform, days),
            "growth_rate": self.get_growth_rate(platform, days),
        }

    def _load(self) -> None:
        if self.storage_path.exists():
            try:
                data = json.loads(self.storage_path.read_text())
                # Load snapshots
                for s in data.get("snapshots", []):
                    self.account_snapshots.append(DailySnapshot(**s))
            except (json.JSONDecodeError, KeyError):
                pass

    def _save(self) -> None:
        data = {
            "snapshots": [
                {
                    "date": s.date,
                    "platform": s.platform,
                    "followers": s.followers,
                    "impressions": s.impressions,
                    "engagement": s.engagement,
                    "posts_published": s.posts_published,
                    "engagement_rate": s.engagement_rate,
                }
                for s in self.account_snapshots
            ],
            "post_count": len(self.post_metrics),
        }
        self.storage_path.write_text(json.dumps(data, indent=2))
