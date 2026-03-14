"""Budget allocation and tracking for campaigns."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class BudgetAllocation:
    """Budget allocation across categories."""

    content_creation: float = 0.20
    paid_promotion: float = 0.50
    influencer_collab: float = 0.20
    tools_and_analytics: float = 0.10

    def validate(self) -> bool:
        total = (
            self.content_creation + self.paid_promotion +
            self.influencer_collab + self.tools_and_analytics
        )
        return abs(total - 1.0) < 0.01


@dataclass
class SpendRecord:
    """A single spending record."""

    amount: float
    category: str
    platform: str = ""
    campaign_id: str = ""
    description: str = ""
    date: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class BudgetTracker:
    """Track and manage marketing budgets."""

    def __init__(self, total_budget: float = 0.0) -> None:
        self.total_budget = total_budget
        self.allocation = BudgetAllocation()
        self.records: list[SpendRecord] = []

    def record_spend(
        self,
        amount: float,
        category: str,
        platform: str = "",
        campaign_id: str = "",
        description: str = "",
    ) -> None:
        self.records.append(SpendRecord(
            amount=amount,
            category=category,
            platform=platform,
            campaign_id=campaign_id,
            description=description,
        ))

    @property
    def total_spent(self) -> float:
        return sum(r.amount for r in self.records)

    @property
    def remaining(self) -> float:
        return max(0, self.total_budget - self.total_spent)

    def spent_by_category(self) -> dict[str, float]:
        categories: dict[str, float] = {}
        for r in self.records:
            categories[r.category] = categories.get(r.category, 0) + r.amount
        return categories

    def spent_by_platform(self) -> dict[str, float]:
        platforms: dict[str, float] = {}
        for r in self.records:
            if r.platform:
                platforms[r.platform] = platforms.get(r.platform, 0) + r.amount
        return platforms

    def is_over_budget(self, category: str) -> bool:
        allocated = getattr(self.allocation, category, 0) * self.total_budget
        spent = self.spent_by_category().get(category, 0)
        return spent > allocated

    def get_summary(self) -> dict[str, Any]:
        return {
            "total_budget": self.total_budget,
            "total_spent": self.total_spent,
            "remaining": self.remaining,
            "utilization": f"{self.total_spent / max(self.total_budget, 1):.1%}",
            "by_category": self.spent_by_category(),
            "by_platform": self.spent_by_platform(),
        }
