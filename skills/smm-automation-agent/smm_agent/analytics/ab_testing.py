"""A/B testing framework for social media content."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


@dataclass
class ABVariant:
    """A single variant in an A/B test."""

    name: str  # "A", "B", etc.
    post_id: str = ""
    platform: str = ""
    impressions: int = 0
    clicks: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    conversions: int = 0

    @property
    def engagement_rate(self) -> float:
        if self.impressions == 0:
            return 0.0
        return (self.likes + self.comments + self.shares) / self.impressions

    @property
    def ctr(self) -> float:
        if self.impressions == 0:
            return 0.0
        return self.clicks / self.impressions


@dataclass
class ABTest:
    """An A/B test comparing content variants."""

    id: str
    name: str
    variable: str  # "hook", "cta", "image", "hashtags", etc.
    platform: str
    success_metric: str = "engagement_rate"  # engagement_rate, ctr, conversions
    variants: list[ABVariant] = field(default_factory=list)
    status: str = "active"  # active, completed, cancelled
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    duration_hours: int = 48
    auto_winner: bool = True
    winner: str = ""

    @property
    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) > self.created_at + timedelta(
            hours=self.duration_hours
        )

    def determine_winner(self) -> str:
        """Determine the winning variant."""
        if not self.variants:
            return ""

        def get_metric(v: ABVariant) -> float:
            if self.success_metric == "engagement_rate":
                return v.engagement_rate
            elif self.success_metric == "ctr":
                return v.ctr
            elif self.success_metric == "conversions":
                return float(v.conversions)
            return v.engagement_rate

        best = max(self.variants, key=get_metric)

        # Check for statistical significance (simplified)
        if len(self.variants) >= 2:
            sorted_variants = sorted(self.variants, key=get_metric, reverse=True)
            best_metric = get_metric(sorted_variants[0])
            second_metric = get_metric(sorted_variants[1])

            if best_metric == 0 or (best_metric - second_metric) / max(best_metric, 0.001) < 0.05:
                return ""  # No clear winner

        self.winner = best.name
        return best.name


class ABTestManager:
    """Manage A/B tests across platforms."""

    def __init__(self, storage_path: str = "./data/ab_tests.json") -> None:
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.tests: list[ABTest] = []
        self._load()

    def create_test(
        self,
        name: str,
        variable: str,
        platform: str,
        variant_names: list[str] | None = None,
        success_metric: str = "engagement_rate",
        duration_hours: int = 48,
        auto_winner: bool = True,
    ) -> ABTest:
        """Create a new A/B test."""
        test = ABTest(
            id=f"ab_{len(self.tests)}_{int(datetime.now(timezone.utc).timestamp())}",
            name=name,
            variable=variable,
            platform=platform,
            success_metric=success_metric,
            duration_hours=duration_hours,
            auto_winner=auto_winner,
            variants=[
                ABVariant(name=n, platform=platform)
                for n in (variant_names or ["A", "B"])
            ],
        )
        self.tests.append(test)
        self._save()
        return test

    def update_variant_metrics(
        self,
        test_id: str,
        variant_name: str,
        metrics: dict[str, int],
    ) -> None:
        """Update metrics for a variant."""
        for test in self.tests:
            if test.id == test_id:
                for variant in test.variants:
                    if variant.name == variant_name:
                        variant.impressions += metrics.get("impressions", 0)
                        variant.clicks += metrics.get("clicks", 0)
                        variant.likes += metrics.get("likes", 0)
                        variant.comments += metrics.get("comments", 0)
                        variant.shares += metrics.get("shares", 0)
                        variant.conversions += metrics.get("conversions", 0)
                        break
                break
        self._save()

    def check_and_complete_tests(self) -> list[ABTest]:
        """Check active tests and complete expired ones."""
        completed: list[ABTest] = []

        for test in self.tests:
            if test.status != "active":
                continue

            if test.is_expired:
                winner = test.determine_winner()
                if winner or not test.auto_winner:
                    test.status = "completed"
                    completed.append(test)

        if completed:
            self._save()
        return completed

    def get_active_tests(self) -> list[ABTest]:
        return [t for t in self.tests if t.status == "active"]

    def get_test_results(self, test_id: str) -> dict[str, Any]:
        """Get detailed results for a test."""
        for test in self.tests:
            if test.id != test_id:
                continue

            return {
                "id": test.id,
                "name": test.name,
                "variable": test.variable,
                "status": test.status,
                "winner": test.winner,
                "variants": [
                    {
                        "name": v.name,
                        "impressions": v.impressions,
                        "engagement_rate": f"{v.engagement_rate:.2%}",
                        "ctr": f"{v.ctr:.2%}",
                        "likes": v.likes,
                        "comments": v.comments,
                        "shares": v.shares,
                    }
                    for v in test.variants
                ],
            }

        return {}

    def _load(self) -> None:
        if self.storage_path.exists():
            try:
                data = json.loads(self.storage_path.read_text())
                for item in data:
                    test = ABTest(
                        id=item["id"],
                        name=item["name"],
                        variable=item["variable"],
                        platform=item["platform"],
                        success_metric=item.get("success_metric", "engagement_rate"),
                        status=item.get("status", "active"),
                        winner=item.get("winner", ""),
                    )
                    for v in item.get("variants", []):
                        test.variants.append(ABVariant(**v))
                    self.tests.append(test)
            except (json.JSONDecodeError, KeyError):
                pass

    def _save(self) -> None:
        data = []
        for test in self.tests:
            data.append({
                "id": test.id,
                "name": test.name,
                "variable": test.variable,
                "platform": test.platform,
                "success_metric": test.success_metric,
                "status": test.status,
                "winner": test.winner,
                "duration_hours": test.duration_hours,
                "variants": [
                    {
                        "name": v.name,
                        "post_id": v.post_id,
                        "platform": v.platform,
                        "impressions": v.impressions,
                        "clicks": v.clicks,
                        "likes": v.likes,
                        "comments": v.comments,
                        "shares": v.shares,
                        "conversions": v.conversions,
                    }
                    for v in test.variants
                ],
            })
        self.storage_path.write_text(json.dumps(data, indent=2))
