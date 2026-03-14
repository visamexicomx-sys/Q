"""Post queue and scheduling engine."""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from ..content.generator import GeneratedPost
from ..platforms.base import PostResult

logger = logging.getLogger(__name__)


@dataclass
class QueueItem:
    """A queued post waiting to be published."""

    id: str = ""
    platform: str = ""
    post: GeneratedPost | None = None
    scheduled_at: datetime | None = None
    priority: int = 2  # 0=urgent, 1=campaign, 2=evergreen, 3=filler
    status: str = "queued"  # queued, publishing, published, failed, cancelled
    retry_count: int = 0
    max_retries: int = 3
    result: PostResult | None = None
    campaign_id: str = ""
    ab_test_id: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "platform": self.platform,
            "text": self.post.text if self.post else "",
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "priority": self.priority,
            "status": self.status,
            "retry_count": self.retry_count,
            "campaign_id": self.campaign_id,
        }


class PostQueue:
    """Manages the post queue for scheduled publishing."""

    def __init__(self, storage_path: str = "./data/queue.json") -> None:
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.items: list[QueueItem] = []
        self._running = False
        self._load()

    def add(self, item: QueueItem) -> str:
        """Add an item to the queue."""
        if not item.id:
            item.id = f"q_{len(self.items)}_{int(datetime.now(timezone.utc).timestamp())}"

        # Enforce minimum gap between posts on same platform
        if item.scheduled_at:
            conflict = self._check_time_conflict(
                item.platform, item.scheduled_at
            )
            if conflict:
                item.scheduled_at = self._find_next_slot(
                    item.platform, item.scheduled_at
                )

        self.items.append(item)
        self._sort_queue()
        self._save()
        return item.id

    def remove(self, item_id: str) -> bool:
        """Remove an item from the queue."""
        before = len(self.items)
        self.items = [i for i in self.items if i.id != item_id]
        if len(self.items) < before:
            self._save()
            return True
        return False

    def get_due_items(self) -> list[QueueItem]:
        """Get items that are due to be published now."""
        now = datetime.now(timezone.utc)
        return [
            item for item in self.items
            if item.status == "queued"
            and item.scheduled_at
            and item.scheduled_at <= now
        ]

    def get_upcoming(self, hours: int = 24) -> list[QueueItem]:
        """Get items scheduled within the next N hours."""
        now = datetime.now(timezone.utc)
        cutoff = now + timedelta(hours=hours)
        return [
            item for item in self.items
            if item.status == "queued"
            and item.scheduled_at
            and now <= item.scheduled_at <= cutoff
        ]

    def mark_published(self, item_id: str, result: PostResult) -> None:
        """Mark an item as published."""
        for item in self.items:
            if item.id == item_id:
                item.status = "published"
                item.result = result
                break
        self._save()

    def mark_failed(self, item_id: str, error: str) -> None:
        """Mark an item as failed, with retry logic."""
        for item in self.items:
            if item.id == item_id:
                item.retry_count += 1
                if item.retry_count >= item.max_retries:
                    item.status = "failed"
                else:
                    # Retry with exponential backoff
                    delay = 2 ** item.retry_count * 60  # minutes
                    item.scheduled_at = datetime.now(timezone.utc) + timedelta(seconds=delay)
                    item.status = "queued"
                break
        self._save()

    def get_stats(self) -> dict[str, Any]:
        """Get queue statistics."""
        return {
            "total": len(self.items),
            "queued": len([i for i in self.items if i.status == "queued"]),
            "published": len([i for i in self.items if i.status == "published"]),
            "failed": len([i for i in self.items if i.status == "failed"]),
            "by_platform": {
                platform: len([i for i in self.items if i.platform == platform])
                for platform in set(i.platform for i in self.items)
            },
        }

    def clear_published(self, older_than_days: int = 30) -> int:
        """Clear old published items."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=older_than_days)
        before = len(self.items)
        self.items = [
            i for i in self.items
            if not (i.status == "published" and i.created_at < cutoff)
        ]
        removed = before - len(self.items)
        if removed:
            self._save()
        return removed

    def _check_time_conflict(
        self, platform: str, scheduled_at: datetime, min_gap_hours: int = 2
    ) -> bool:
        """Check if there's a time conflict with existing queue items."""
        for item in self.items:
            if (
                item.platform == platform
                and item.scheduled_at
                and item.status == "queued"
                and abs((item.scheduled_at - scheduled_at).total_seconds())
                < min_gap_hours * 3600
            ):
                return True
        return False

    def _find_next_slot(
        self, platform: str, after: datetime, min_gap_hours: int = 2
    ) -> datetime:
        """Find the next available slot for a platform."""
        candidate = after + timedelta(hours=min_gap_hours)
        while self._check_time_conflict(platform, candidate, min_gap_hours):
            candidate += timedelta(hours=1)
        return candidate

    def _sort_queue(self) -> None:
        """Sort queue by priority then scheduled time."""
        self.items.sort(
            key=lambda i: (
                i.priority,
                i.scheduled_at or datetime.max.replace(tzinfo=timezone.utc),
            )
        )

    def _load(self) -> None:
        """Load queue from storage."""
        if self.storage_path.exists():
            try:
                data = json.loads(self.storage_path.read_text())
                for item_data in data:
                    item = QueueItem(
                        id=item_data.get("id", ""),
                        platform=item_data.get("platform", ""),
                        priority=item_data.get("priority", 2),
                        status=item_data.get("status", "queued"),
                        retry_count=item_data.get("retry_count", 0),
                        campaign_id=item_data.get("campaign_id", ""),
                    )
                    if item_data.get("scheduled_at"):
                        item.scheduled_at = datetime.fromisoformat(
                            item_data["scheduled_at"]
                        )
                    self.items.append(item)
            except (json.JSONDecodeError, KeyError):
                self.items = []

    def _save(self) -> None:
        """Save queue to storage."""
        data = [i.to_dict() for i in self.items]
        self.storage_path.write_text(json.dumps(data, indent=2, default=str))
