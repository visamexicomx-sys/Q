"""Optimal posting time calculator."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone
from typing import Any


@dataclass
class TimeSlot:
    """A recommended posting time slot."""

    time: time
    score: float  # 0.0 - 1.0, higher is better
    day_of_week: int  # 0=Monday, 6=Sunday
    platform: str = ""


# Default optimal times based on industry research
DEFAULT_OPTIMAL_TIMES: dict[str, list[dict[str, Any]]] = {
    "twitter": [
        {"time": "09:00", "days": [1, 2, 3], "score": 0.9},
        {"time": "12:00", "days": [0, 1, 2, 3, 4], "score": 0.85},
        {"time": "17:00", "days": [1, 2, 3], "score": 0.8},
        {"time": "20:00", "days": [0, 1, 2, 3, 4], "score": 0.7},
    ],
    "instagram": [
        {"time": "11:00", "days": [1, 2, 4], "score": 0.9},
        {"time": "14:00", "days": [0, 1, 2, 3, 4], "score": 0.85},
        {"time": "19:00", "days": [1, 2, 4], "score": 0.88},
        {"time": "21:00", "days": [5, 6], "score": 0.75},
    ],
    "linkedin": [
        {"time": "07:30", "days": [1, 2, 3], "score": 0.9},
        {"time": "12:00", "days": [1, 2, 3], "score": 0.87},
        {"time": "17:30", "days": [1, 2, 3], "score": 0.82},
    ],
    "facebook": [
        {"time": "09:00", "days": [2, 3, 4], "score": 0.85},
        {"time": "13:00", "days": [2, 3, 4], "score": 0.88},
        {"time": "16:00", "days": [2, 3, 4], "score": 0.8},
    ],
    "tiktok": [
        {"time": "10:00", "days": [1, 3, 4], "score": 0.85},
        {"time": "14:00", "days": [1, 3, 4], "score": 0.9},
        {"time": "21:00", "days": [0, 1, 2, 3, 4, 5, 6], "score": 0.88},
    ],
    "pinterest": [
        {"time": "14:00", "days": [5, 6], "score": 0.9},
        {"time": "20:00", "days": [0, 1, 2, 3, 4], "score": 0.85},
        {"time": "23:00", "days": [5, 6], "score": 0.8},
    ],
    "youtube": [
        {"time": "14:00", "days": [3, 4], "score": 0.9},
        {"time": "17:00", "days": [5, 6], "score": 0.85},
    ],
    "threads": [
        {"time": "09:00", "days": [1, 2, 3], "score": 0.85},
        {"time": "12:00", "days": [0, 1, 2, 3, 4], "score": 0.88},
        {"time": "18:00", "days": [1, 2, 3, 4], "score": 0.82},
    ],
}


class OptimalTimeCalculator:
    """Calculate optimal posting times using engagement data and defaults."""

    def __init__(self, timezone_str: str = "UTC") -> None:
        self.timezone_str = timezone_str
        self._engagement_history: dict[str, list[dict[str, Any]]] = {}

    def get_best_times(
        self,
        platform: str,
        count: int = 3,
        day_of_week: int | None = None,
    ) -> list[TimeSlot]:
        """Get the best posting times for a platform."""
        # Use learned data if available, otherwise defaults
        if platform in self._engagement_history and len(self._engagement_history[platform]) > 20:
            return self._calculate_from_history(platform, count, day_of_week)

        return self._get_defaults(platform, count, day_of_week)

    def get_next_optimal_slot(
        self,
        platform: str,
        after: datetime | None = None,
    ) -> datetime:
        """Get the next optimal posting time after a given datetime."""
        if after is None:
            after = datetime.now(timezone.utc)

        best_times = self.get_best_times(platform, count=10)

        for days_ahead in range(7):
            candidate_date = after + timedelta(days=days_ahead)
            dow = candidate_date.weekday()

            for slot in best_times:
                if slot.day_of_week != dow:
                    continue

                candidate = candidate_date.replace(
                    hour=slot.time.hour,
                    minute=slot.time.minute,
                    second=0,
                    microsecond=0,
                )

                if candidate > after:
                    return candidate

        # Fallback: next day at noon
        return (after + timedelta(days=1)).replace(
            hour=12, minute=0, second=0, microsecond=0
        )

    def record_engagement(
        self,
        platform: str,
        posted_at: datetime,
        engagement_rate: float,
    ) -> None:
        """Record engagement data to improve time predictions."""
        if platform not in self._engagement_history:
            self._engagement_history[platform] = []

        self._engagement_history[platform].append({
            "day_of_week": posted_at.weekday(),
            "hour": posted_at.hour,
            "minute": posted_at.minute,
            "engagement_rate": engagement_rate,
        })

    def get_schedule_for_week(
        self,
        platform: str,
        posts_per_day: int = 2,
        start: datetime | None = None,
    ) -> list[datetime]:
        """Generate a full week schedule for a platform."""
        if start is None:
            start = datetime.now(timezone.utc)

        schedule: list[datetime] = []

        for day in range(7):
            date = start + timedelta(days=day)
            day_slots = self.get_best_times(
                platform, count=posts_per_day, day_of_week=date.weekday()
            )

            for slot in day_slots:
                scheduled = date.replace(
                    hour=slot.time.hour,
                    minute=slot.time.minute,
                    second=0,
                    microsecond=0,
                )
                if scheduled > start:
                    schedule.append(scheduled)

        return schedule[:posts_per_day * 7]

    def _get_defaults(
        self, platform: str, count: int, day_of_week: int | None
    ) -> list[TimeSlot]:
        """Get default optimal times from research data."""
        defaults = DEFAULT_OPTIMAL_TIMES.get(platform, [])
        slots: list[TimeSlot] = []

        for d in defaults:
            t = time.fromisoformat(d["time"])
            for dow in d["days"]:
                if day_of_week is not None and dow != day_of_week:
                    continue
                slots.append(TimeSlot(
                    time=t,
                    score=d["score"],
                    day_of_week=dow,
                    platform=platform,
                ))

        slots.sort(key=lambda s: s.score, reverse=True)
        return slots[:count]

    def _calculate_from_history(
        self, platform: str, count: int, day_of_week: int | None
    ) -> list[TimeSlot]:
        """Calculate optimal times from historical engagement data."""
        history = self._engagement_history.get(platform, [])

        # Group by hour and day
        hour_scores: dict[tuple[int, int], list[float]] = {}
        for entry in history:
            key = (entry["day_of_week"], entry["hour"])
            if day_of_week is not None and entry["day_of_week"] != day_of_week:
                continue
            if key not in hour_scores:
                hour_scores[key] = []
            hour_scores[key].append(entry["engagement_rate"])

        # Average scores
        slots: list[TimeSlot] = []
        for (dow, hour), scores in hour_scores.items():
            avg_score = sum(scores) / len(scores)
            slots.append(TimeSlot(
                time=time(hour=hour),
                score=min(avg_score * 10, 1.0),
                day_of_week=dow,
                platform=platform,
            ))

        slots.sort(key=lambda s: s.score, reverse=True)
        return slots[:count]
