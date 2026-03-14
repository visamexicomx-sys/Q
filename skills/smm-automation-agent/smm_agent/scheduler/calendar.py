"""Content calendar management."""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from ..content.generator import GeneratedPost


@dataclass
class CalendarEntry:
    """A single entry in the content calendar."""

    id: str = ""
    platform: str = ""
    scheduled_at: datetime | None = None
    post: GeneratedPost | None = None
    status: str = "draft"  # draft, approved, scheduled, published, failed
    campaign_id: str = ""
    ab_test_id: str = ""
    notes: str = ""
    published_post_id: str = ""
    published_url: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "platform": self.platform,
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "status": self.status,
            "campaign_id": self.campaign_id,
            "text": self.post.text if self.post else "",
            "content_type": self.post.content_type if self.post else "",
            "hashtags": self.post.hashtags if self.post else [],
            "notes": self.notes,
        }


class ContentCalendar:
    """Manages the content calendar with scheduling and organization."""

    def __init__(self, storage_path: str = "./data/calendar.json") -> None:
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.entries: list[CalendarEntry] = []
        self._load()

    def add_entry(self, entry: CalendarEntry) -> str:
        """Add an entry to the calendar."""
        if not entry.id:
            entry.id = f"cal_{len(self.entries)}_{int(datetime.now(timezone.utc).timestamp())}"
        self.entries.append(entry)
        self._save()
        return entry.id

    def remove_entry(self, entry_id: str) -> bool:
        """Remove an entry from the calendar."""
        before = len(self.entries)
        self.entries = [e for e in self.entries if e.id != entry_id]
        if len(self.entries) < before:
            self._save()
            return True
        return False

    def update_status(self, entry_id: str, status: str) -> bool:
        """Update the status of a calendar entry."""
        for entry in self.entries:
            if entry.id == entry_id:
                entry.status = status
                self._save()
                return True
        return False

    def get_entries_for_date(self, date: datetime) -> list[CalendarEntry]:
        """Get all entries scheduled for a specific date."""
        return [
            e for e in self.entries
            if e.scheduled_at and e.scheduled_at.date() == date.date()
        ]

    def get_entries_for_range(
        self, start: datetime, end: datetime
    ) -> list[CalendarEntry]:
        """Get entries within a date range."""
        return [
            e for e in self.entries
            if e.scheduled_at and start <= e.scheduled_at <= end
        ]

    def get_entries_by_platform(self, platform: str) -> list[CalendarEntry]:
        """Get entries filtered by platform."""
        return [e for e in self.entries if e.platform == platform]

    def get_entries_by_status(self, status: str) -> list[CalendarEntry]:
        """Get entries filtered by status."""
        return [e for e in self.entries if e.status == status]

    def get_upcoming(self, hours: int = 24) -> list[CalendarEntry]:
        """Get entries scheduled within the next N hours."""
        now = datetime.now(timezone.utc)
        cutoff = now + timedelta(hours=hours)
        return [
            e for e in self.entries
            if e.scheduled_at
            and now <= e.scheduled_at <= cutoff
            and e.status in ("approved", "scheduled")
        ]

    def get_gaps(
        self,
        start: datetime,
        end: datetime,
        platform: str,
        min_gap_hours: int = 3,
    ) -> list[datetime]:
        """Find scheduling gaps where no content is planned."""
        entries = [
            e for e in self.entries
            if e.platform == platform
            and e.scheduled_at
            and start <= e.scheduled_at <= end
        ]
        entries.sort(key=lambda e: e.scheduled_at)

        gaps: list[datetime] = []
        current = start

        for entry in entries:
            if (entry.scheduled_at - current).total_seconds() > min_gap_hours * 3600:
                gap_time = current + (entry.scheduled_at - current) / 2
                gaps.append(gap_time)
            current = entry.scheduled_at

        if (end - current).total_seconds() > min_gap_hours * 3600:
            gaps.append(current + (end - current) / 2)

        return gaps

    def generate_weekly_view(self, start: datetime) -> dict[str, list[dict[str, Any]]]:
        """Generate a week view of the calendar."""
        end = start + timedelta(days=7)
        entries = self.get_entries_for_range(start, end)

        weekly: dict[str, list[dict[str, Any]]] = {}
        for i in range(7):
            day = start + timedelta(days=i)
            day_str = day.strftime("%Y-%m-%d (%A)")
            weekly[day_str] = [
                e.to_dict() for e in entries
                if e.scheduled_at and e.scheduled_at.date() == day.date()
            ]

        return weekly

    def get_stats(self) -> dict[str, Any]:
        """Get calendar statistics."""
        now = datetime.now(timezone.utc)
        return {
            "total_entries": len(self.entries),
            "by_status": {
                status: len([e for e in self.entries if e.status == status])
                for status in ["draft", "approved", "scheduled", "published", "failed"]
            },
            "by_platform": {
                platform: len([e for e in self.entries if e.platform == platform])
                for platform in set(e.platform for e in self.entries)
            },
            "upcoming_24h": len(self.get_upcoming(24)),
            "upcoming_7d": len(self.get_upcoming(168)),
        }

    def _load(self) -> None:
        """Load calendar from storage."""
        if self.storage_path.exists():
            try:
                data = json.loads(self.storage_path.read_text())
                for item in data:
                    entry = CalendarEntry(
                        id=item.get("id", ""),
                        platform=item.get("platform", ""),
                        status=item.get("status", "draft"),
                        campaign_id=item.get("campaign_id", ""),
                        notes=item.get("notes", ""),
                    )
                    if item.get("scheduled_at"):
                        entry.scheduled_at = datetime.fromisoformat(item["scheduled_at"])
                    self.entries.append(entry)
            except (json.JSONDecodeError, KeyError):
                self.entries = []

    def _save(self) -> None:
        """Save calendar to storage."""
        data = [e.to_dict() for e in self.entries]
        self.storage_path.write_text(json.dumps(data, indent=2, default=str))
