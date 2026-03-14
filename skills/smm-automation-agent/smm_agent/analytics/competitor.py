"""Competitor analysis module."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class CompetitorProfile:
    """Tracked competitor profile."""

    handle: str
    platforms: list[str] = field(default_factory=list)
    followers: dict[str, int] = field(default_factory=dict)
    avg_engagement_rate: dict[str, float] = field(default_factory=dict)
    posting_frequency: dict[str, float] = field(default_factory=dict)  # posts per day
    top_hashtags: dict[str, list[str]] = field(default_factory=dict)
    content_types: dict[str, dict[str, float]] = field(default_factory=dict)
    last_updated: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class CompetitorInsight:
    """An actionable insight from competitor analysis."""

    category: str  # content_gap, opportunity, threat, benchmark
    description: str
    priority: str = "medium"  # low, medium, high
    related_competitor: str = ""
    actionable: str = ""


class CompetitorAnalyzer:
    """Analyze competitor social media presence."""

    def __init__(self) -> None:
        self.competitors: list[CompetitorProfile] = []

    def add_competitor(
        self, handle: str, platforms: list[str]
    ) -> CompetitorProfile:
        """Add a competitor to track."""
        profile = CompetitorProfile(handle=handle, platforms=platforms)
        self.competitors.append(profile)
        return profile

    def analyze_content_gaps(
        self,
        our_content_types: dict[str, float],
        platform: str,
    ) -> list[CompetitorInsight]:
        """Identify content types competitors use that we don't."""
        insights: list[CompetitorInsight] = []

        for comp in self.competitors:
            comp_types = comp.content_types.get(platform, {})
            for content_type, frequency in comp_types.items():
                our_frequency = our_content_types.get(content_type, 0)
                if frequency > 0.1 and our_frequency < 0.05:
                    insights.append(CompetitorInsight(
                        category="content_gap",
                        description=f"{comp.handle} uses '{content_type}' content "
                                  f"({frequency:.0%} of posts) but we rarely do ({our_frequency:.0%}).",
                        priority="high" if frequency > 0.2 else "medium",
                        related_competitor=comp.handle,
                        actionable=f"Test {content_type} content format to see if it resonates with our audience.",
                    ))

        return insights

    def benchmark_engagement(
        self, our_engagement: dict[str, float]
    ) -> list[CompetitorInsight]:
        """Benchmark our engagement against competitors."""
        insights: list[CompetitorInsight] = []

        for platform, our_rate in our_engagement.items():
            comp_rates = [
                (c.handle, c.avg_engagement_rate.get(platform, 0))
                for c in self.competitors
                if platform in c.platforms
            ]

            if not comp_rates:
                continue

            avg_comp_rate = sum(r for _, r in comp_rates) / len(comp_rates)
            best_comp, best_rate = max(comp_rates, key=lambda x: x[1])

            if our_rate < avg_comp_rate * 0.8:
                insights.append(CompetitorInsight(
                    category="benchmark",
                    description=f"Our {platform} engagement ({our_rate:.2%}) is below "
                              f"competitor average ({avg_comp_rate:.2%}).",
                    priority="high",
                    actionable=f"Study {best_comp}'s content strategy on {platform} "
                              f"(engagement: {best_rate:.2%}).",
                ))
            elif our_rate > avg_comp_rate * 1.2:
                insights.append(CompetitorInsight(
                    category="benchmark",
                    description=f"Our {platform} engagement ({our_rate:.2%}) outperforms "
                              f"competitor average ({avg_comp_rate:.2%}).",
                    priority="low",
                    actionable=f"Maintain current strategy and consider increasing investment.",
                ))

        return insights

    def detect_campaigns(self) -> list[CompetitorInsight]:
        """Detect competitor campaign activity."""
        insights: list[CompetitorInsight] = []

        for comp in self.competitors:
            for platform, freq in comp.posting_frequency.items():
                if freq > 5:  # More than 5 posts/day suggests a campaign
                    insights.append(CompetitorInsight(
                        category="threat",
                        description=f"{comp.handle} has increased posting to "
                                  f"{freq:.1f} posts/day on {platform}. "
                                  f"Possible campaign detected.",
                        priority="high",
                        related_competitor=comp.handle,
                        actionable="Monitor their content and consider a counter-campaign.",
                    ))

        return insights

    def get_hashtag_opportunities(
        self, our_hashtags: set[str], platform: str
    ) -> list[str]:
        """Find hashtags competitors use that we don't."""
        comp_hashtags: set[str] = set()
        for comp in self.competitors:
            tags = comp.top_hashtags.get(platform, [])
            comp_hashtags.update(tags)

        opportunities = comp_hashtags - our_hashtags
        return sorted(opportunities)

    def generate_report(self) -> dict[str, Any]:
        """Generate a full competitor analysis report."""
        return {
            "competitors_tracked": len(self.competitors),
            "competitors": [
                {
                    "handle": c.handle,
                    "platforms": c.platforms,
                    "followers": c.followers,
                    "engagement_rates": {
                        p: f"{r:.2%}" for p, r in c.avg_engagement_rate.items()
                    },
                    "posting_frequency": c.posting_frequency,
                    "last_updated": c.last_updated.isoformat(),
                }
                for c in self.competitors
            ],
            "insights": [
                {
                    "category": i.category,
                    "description": i.description,
                    "priority": i.priority,
                    "actionable": i.actionable,
                }
                for i in (
                    self.benchmark_engagement({}) +
                    self.detect_campaigns() +
                    self.analyze_content_gaps({}, "instagram")
                )
            ],
        }
