"""Mention and comment monitoring system."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

from ..platforms.base import Comment, PlatformConnector

logger = logging.getLogger(__name__)


@dataclass
class MentionAlert:
    """An alert for a significant mention or comment."""

    comment: Comment
    alert_type: str  # new_mention, high_follower, negative, viral_post, question
    priority: str = "normal"  # low, normal, high, urgent
    handled: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class MentionMonitor:
    """Monitor mentions, comments, and engagement across platforms."""

    def __init__(
        self,
        connectors: dict[str, PlatformConnector] | None = None,
        check_interval: int = 900,  # 15 minutes
    ) -> None:
        self.connectors = connectors or {}
        self.check_interval = check_interval
        self.alerts: list[MentionAlert] = []
        self._last_check: dict[str, datetime] = {}
        self._seen_comments: set[str] = set()
        self._running = False

    async def check_platform(
        self, platform: str, post_ids: list[str]
    ) -> list[MentionAlert]:
        """Check a platform for new comments and mentions."""
        connector = self.connectors.get(platform)
        if not connector:
            return []

        new_alerts: list[MentionAlert] = []

        for post_id in post_ids:
            try:
                comments = await connector.get_recent_comments(post_id, limit=50)

                for comment in comments:
                    key = f"{platform}:{comment.comment_id}"
                    if key in self._seen_comments:
                        continue
                    self._seen_comments.add(key)

                    alert = self._classify_comment(comment)
                    if alert:
                        new_alerts.append(alert)

            except Exception as e:
                logger.error(f"Error checking {platform} post {post_id}: {e}")

        self._last_check[platform] = datetime.now(timezone.utc)
        self.alerts.extend(new_alerts)
        return new_alerts

    async def check_all_platforms(
        self, post_ids: dict[str, list[str]]
    ) -> list[MentionAlert]:
        """Check all platforms for new activity."""
        all_alerts: list[MentionAlert] = []

        tasks = [
            self.check_platform(platform, ids)
            for platform, ids in post_ids.items()
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)
        for result in results:
            if isinstance(result, list):
                all_alerts.extend(result)

        return all_alerts

    def get_unhandled_alerts(
        self, priority: str | None = None
    ) -> list[MentionAlert]:
        """Get alerts that haven't been handled yet."""
        alerts = [a for a in self.alerts if not a.handled]
        if priority:
            alerts = [a for a in alerts if a.priority == priority]
        return alerts

    def mark_handled(self, alert: MentionAlert) -> None:
        """Mark an alert as handled."""
        alert.handled = True

    def get_stats(self) -> dict[str, Any]:
        """Get monitoring statistics."""
        return {
            "total_alerts": len(self.alerts),
            "unhandled": len(self.get_unhandled_alerts()),
            "by_type": {
                alert_type: len([a for a in self.alerts if a.alert_type == alert_type])
                for alert_type in {"new_mention", "high_follower", "negative", "viral_post", "question"}
            },
            "last_check": {
                platform: dt.isoformat()
                for platform, dt in self._last_check.items()
            },
        }

    def _classify_comment(self, comment: Comment) -> MentionAlert | None:
        """Classify a comment and create an alert if needed."""
        text = comment.text.lower()

        # Check for questions
        if "?" in text or any(w in text for w in ["how", "what", "when", "why", "help"]):
            return MentionAlert(
                comment=comment,
                alert_type="question",
                priority="high",
            )

        # Check for negative sentiment
        negative_words = {"terrible", "awful", "worst", "hate", "disappointed", "broken", "scam"}
        if any(word in text for word in negative_words):
            return MentionAlert(
                comment=comment,
                alert_type="negative",
                priority="urgent",
            )

        # Default mention
        return MentionAlert(
            comment=comment,
            alert_type="new_mention",
            priority="normal",
        )
