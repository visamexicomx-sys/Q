"""Marketing funnel automation."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class FunnelStage:
    """A stage in the marketing funnel."""

    name: str
    content_types: list[str] = field(default_factory=list)
    platforms: list[str] = field(default_factory=list)
    cta: str = ""
    kpi: str = ""
    target_value: float = 0.0
    current_value: float = 0.0

    @property
    def progress(self) -> float:
        if self.target_value == 0:
            return 0.0
        return min(self.current_value / self.target_value, 1.0)


DEFAULT_FUNNEL = [
    FunnelStage(
        name="awareness",
        content_types=["educational", "trending", "viral"],
        cta="Follow for more",
        kpi="impressions",
    ),
    FunnelStage(
        name="consideration",
        content_types=["case-study", "comparison", "how-to"],
        cta="Learn more",
        kpi="clicks",
    ),
    FunnelStage(
        name="conversion",
        content_types=["testimonial", "offer", "product-highlight"],
        cta="Try it free",
        kpi="conversions",
    ),
    FunnelStage(
        name="retention",
        content_types=["tips", "community", "behind-the-scenes"],
        cta="Join the community",
        kpi="engagement_rate",
    ),
    FunnelStage(
        name="advocacy",
        content_types=["ugc", "testimonial", "referral"],
        cta="Share with a friend",
        kpi="shares",
    ),
]


class FunnelManager:
    """Manage the marketing funnel and content distribution."""

    def __init__(self, stages: list[FunnelStage] | None = None) -> None:
        self.stages = stages or [FunnelStage(**{
            "name": s.name,
            "content_types": s.content_types,
            "cta": s.cta,
            "kpi": s.kpi,
        }) for s in DEFAULT_FUNNEL]

    def get_stage(self, name: str) -> FunnelStage | None:
        for stage in self.stages:
            if stage.name == name:
                return stage
        return None

    def get_content_distribution(self) -> dict[str, float]:
        """Get recommended content distribution across funnel stages."""
        return {
            "awareness": 0.35,
            "consideration": 0.25,
            "conversion": 0.20,
            "retention": 0.15,
            "advocacy": 0.05,
        }

    def update_metrics(self, stage_name: str, value: float) -> None:
        stage = self.get_stage(stage_name)
        if stage:
            stage.current_value = value

    def get_funnel_health(self) -> dict[str, Any]:
        return {
            "stages": [
                {
                    "name": s.name,
                    "kpi": s.kpi,
                    "target": s.target_value,
                    "current": s.current_value,
                    "progress": f"{s.progress:.1%}",
                }
                for s in self.stages
            ],
            "overall_progress": sum(s.progress for s in self.stages) / len(self.stages)
            if self.stages else 0,
        }

    def recommend_content_type(self) -> str:
        """Recommend which funnel stage needs more content."""
        weakest = min(self.stages, key=lambda s: s.progress)
        return weakest.name
