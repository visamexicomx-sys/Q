"""Campaign lifecycle management."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


@dataclass
class Campaign:
    """A social media marketing campaign."""

    id: str
    name: str
    campaign_type: str  # product_launch, event, awareness, lead_gen, seasonal, contest
    platforms: list[str] = field(default_factory=list)
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: str = "planning"  # planning, active, paused, completed, cancelled
    goals: dict[str, Any] = field(default_factory=dict)
    budget: float = 0.0
    spent: float = 0.0
    content_count: int = 0
    posts_published: int = 0
    total_impressions: int = 0
    total_engagement: int = 0
    total_clicks: int = 0
    hashtag: str = ""
    target_audience: str = ""
    notes: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def is_active(self) -> bool:
        now = datetime.now(timezone.utc)
        return (
            self.status == "active"
            and self.start_date is not None
            and self.start_date <= now
            and (self.end_date is None or self.end_date >= now)
        )

    @property
    def days_remaining(self) -> int:
        if not self.end_date:
            return -1
        return max(0, (self.end_date - datetime.now(timezone.utc)).days)

    @property
    def budget_remaining(self) -> float:
        return max(0, self.budget - self.spent)

    @property
    def roi(self) -> float:
        if self.spent == 0:
            return 0.0
        return self.total_engagement / self.spent


class CampaignManager:
    """Manage the lifecycle of marketing campaigns."""

    def __init__(self, storage_path: str = "./data/campaigns.json") -> None:
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.campaigns: list[Campaign] = []
        self._load()

    def create_campaign(
        self,
        name: str,
        campaign_type: str,
        platforms: list[str],
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        budget: float = 0.0,
        goals: dict[str, Any] | None = None,
    ) -> Campaign:
        """Create a new campaign."""
        campaign = Campaign(
            id=f"camp_{len(self.campaigns)}_{int(datetime.now(timezone.utc).timestamp())}",
            name=name,
            campaign_type=campaign_type,
            platforms=platforms,
            start_date=start_date,
            end_date=end_date,
            budget=budget,
            goals=goals or {},
        )
        self.campaigns.append(campaign)
        self._save()
        return campaign

    def start_campaign(self, campaign_id: str) -> bool:
        """Activate a campaign."""
        for c in self.campaigns:
            if c.id == campaign_id:
                c.status = "active"
                if not c.start_date:
                    c.start_date = datetime.now(timezone.utc)
                self._save()
                return True
        return False

    def pause_campaign(self, campaign_id: str) -> bool:
        for c in self.campaigns:
            if c.id == campaign_id:
                c.status = "paused"
                self._save()
                return True
        return False

    def complete_campaign(self, campaign_id: str) -> bool:
        for c in self.campaigns:
            if c.id == campaign_id:
                c.status = "completed"
                c.end_date = datetime.now(timezone.utc)
                self._save()
                return True
        return False

    def record_spend(self, campaign_id: str, amount: float) -> None:
        for c in self.campaigns:
            if c.id == campaign_id:
                c.spent += amount
                self._save()
                return

    def record_metrics(
        self,
        campaign_id: str,
        impressions: int = 0,
        engagement: int = 0,
        clicks: int = 0,
    ) -> None:
        for c in self.campaigns:
            if c.id == campaign_id:
                c.total_impressions += impressions
                c.total_engagement += engagement
                c.total_clicks += clicks
                self._save()
                return

    def get_active_campaigns(self) -> list[Campaign]:
        return [c for c in self.campaigns if c.is_active]

    def get_campaign_status(self, campaign_id: str) -> dict[str, Any]:
        for c in self.campaigns:
            if c.id != campaign_id:
                continue
            return {
                "id": c.id,
                "name": c.name,
                "status": c.status,
                "type": c.campaign_type,
                "platforms": c.platforms,
                "budget": c.budget,
                "spent": c.spent,
                "budget_remaining": c.budget_remaining,
                "days_remaining": c.days_remaining,
                "posts_published": c.posts_published,
                "total_impressions": c.total_impressions,
                "total_engagement": c.total_engagement,
                "total_clicks": c.total_clicks,
                "roi": f"{c.roi:.2f}",
            }
        return {}

    def check_expiring_campaigns(self, days: int = 3) -> list[Campaign]:
        """Find campaigns expiring within N days."""
        return [
            c for c in self.campaigns
            if c.is_active and 0 <= c.days_remaining <= days
        ]

    def _load(self) -> None:
        if self.storage_path.exists():
            try:
                data = json.loads(self.storage_path.read_text())
                for item in data:
                    c = Campaign(
                        id=item["id"],
                        name=item["name"],
                        campaign_type=item.get("campaign_type", "awareness"),
                        platforms=item.get("platforms", []),
                        status=item.get("status", "planning"),
                        budget=item.get("budget", 0),
                        spent=item.get("spent", 0),
                        posts_published=item.get("posts_published", 0),
                        total_impressions=item.get("total_impressions", 0),
                        total_engagement=item.get("total_engagement", 0),
                        total_clicks=item.get("total_clicks", 0),
                    )
                    if item.get("start_date"):
                        c.start_date = datetime.fromisoformat(item["start_date"])
                    if item.get("end_date"):
                        c.end_date = datetime.fromisoformat(item["end_date"])
                    self.campaigns.append(c)
            except (json.JSONDecodeError, KeyError):
                pass

    def _save(self) -> None:
        data = []
        for c in self.campaigns:
            data.append({
                "id": c.id,
                "name": c.name,
                "campaign_type": c.campaign_type,
                "platforms": c.platforms,
                "status": c.status,
                "start_date": c.start_date.isoformat() if c.start_date else None,
                "end_date": c.end_date.isoformat() if c.end_date else None,
                "budget": c.budget,
                "spent": c.spent,
                "posts_published": c.posts_published,
                "total_impressions": c.total_impressions,
                "total_engagement": c.total_engagement,
                "total_clicks": c.total_clicks,
            })
        self.storage_path.write_text(json.dumps(data, indent=2))
