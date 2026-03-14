"""Report generation for social media analytics."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from .tracker import MetricsTracker


@dataclass
class Report:
    """Generated analytics report."""

    title: str
    period: str
    generated_at: datetime
    platforms: list[str]
    data: dict[str, Any]
    recommendations: list[str]

    def to_json(self) -> str:
        return json.dumps({
            "title": self.title,
            "period": self.period,
            "generated_at": self.generated_at.isoformat(),
            "platforms": self.platforms,
            "data": self.data,
            "recommendations": self.recommendations,
        }, indent=2, default=str)

    def to_markdown(self) -> str:
        lines = [
            f"# {self.title}",
            f"**Period:** {self.period}",
            f"**Generated:** {self.generated_at.strftime('%Y-%m-%d %H:%M UTC')}",
            "",
        ]

        for platform, metrics in self.data.get("platform_summaries", {}).items():
            lines.append(f"## {platform.title()}")
            lines.append("")
            lines.append("| Metric | Value |")
            lines.append("|--------|-------|")
            for key, value in metrics.items():
                if isinstance(value, float):
                    lines.append(f"| {key.replace('_', ' ').title()} | {value:.2%} |")
                else:
                    lines.append(f"| {key.replace('_', ' ').title()} | {value:,} |")
            lines.append("")

        if self.data.get("top_posts"):
            lines.append("## Top Performing Posts")
            lines.append("")
            for i, post in enumerate(self.data["top_posts"][:5], 1):
                lines.append(f"{i}. **{post.get('platform', '')}** — "
                           f"{post.get('likes', 0)} likes, "
                           f"{post.get('comments', 0)} comments, "
                           f"{post.get('shares', 0)} shares")
            lines.append("")

        if self.recommendations:
            lines.append("## Recommendations")
            lines.append("")
            for rec in self.recommendations:
                lines.append(f"- {rec}")

        return "\n".join(lines)


class ReportGenerator:
    """Generate analytics reports from tracked metrics."""

    def __init__(self, tracker: MetricsTracker) -> None:
        self.tracker = tracker

    def generate_daily_digest(
        self, platforms: list[str]
    ) -> Report:
        """Generate a daily performance digest."""
        data: dict[str, Any] = {"platform_summaries": {}}

        for platform in platforms:
            data["platform_summaries"][platform] = (
                self.tracker.get_platform_summary(platform, days=1)
            )

        recommendations = self._generate_recommendations(data, "daily")

        return Report(
            title="Daily Social Media Digest",
            period="Last 24 hours",
            generated_at=datetime.now(timezone.utc),
            platforms=platforms,
            data=data,
            recommendations=recommendations,
        )

    def generate_weekly_report(
        self, platforms: list[str]
    ) -> Report:
        """Generate a weekly performance report."""
        data: dict[str, Any] = {
            "platform_summaries": {},
            "top_posts": [],
            "growth": {},
        }

        for platform in platforms:
            summary = self.tracker.get_platform_summary(platform, days=7)
            data["platform_summaries"][platform] = summary

            top = self.tracker.get_top_posts(platform, limit=3, days=7)
            for post in top:
                data["top_posts"].append({
                    "platform": platform,
                    "post_id": post.post_id,
                    "likes": post.likes,
                    "comments": post.comments,
                    "shares": post.shares,
                    "impressions": post.impressions,
                })

            data["growth"][platform] = self.tracker.get_growth_rate(platform, 7)

        recommendations = self._generate_recommendations(data, "weekly")

        return Report(
            title="Weekly Social Media Report",
            period="Last 7 days",
            generated_at=datetime.now(timezone.utc),
            platforms=platforms,
            data=data,
            recommendations=recommendations,
        )

    def generate_monthly_report(
        self, platforms: list[str]
    ) -> Report:
        """Generate a monthly performance report."""
        data: dict[str, Any] = {
            "platform_summaries": {},
            "top_posts": [],
            "growth": {},
            "content_type_performance": {},
        }

        for platform in platforms:
            summary = self.tracker.get_platform_summary(platform, days=30)
            data["platform_summaries"][platform] = summary

            top = self.tracker.get_top_posts(platform, limit=5, days=30)
            for post in top:
                data["top_posts"].append({
                    "platform": platform,
                    "post_id": post.post_id,
                    "likes": post.likes,
                    "comments": post.comments,
                    "shares": post.shares,
                    "impressions": post.impressions,
                })

            data["growth"][platform] = self.tracker.get_growth_rate(platform, 30)

        recommendations = self._generate_recommendations(data, "monthly")

        return Report(
            title="Monthly Social Media Report",
            period="Last 30 days",
            generated_at=datetime.now(timezone.utc),
            platforms=platforms,
            data=data,
            recommendations=recommendations,
        )

    def _generate_recommendations(
        self, data: dict[str, Any], period: str
    ) -> list[str]:
        """Generate actionable recommendations from data."""
        recommendations: list[str] = []

        for platform, summary in data.get("platform_summaries", {}).items():
            eng_rate = summary.get("avg_engagement_rate", 0)

            if eng_rate < 0.01:
                recommendations.append(
                    f"[{platform}] Engagement rate is below 1%. "
                    f"Try more interactive content (polls, questions, challenges)."
                )
            elif eng_rate > 0.05:
                recommendations.append(
                    f"[{platform}] Great engagement ({eng_rate:.1%})! "
                    f"Double down on this content strategy."
                )

            if summary.get("total_posts", 0) == 0:
                recommendations.append(
                    f"[{platform}] No posts published. Increase posting frequency."
                )

        growth_data = data.get("growth", {})
        for platform, rate in growth_data.items():
            if rate < 0:
                recommendations.append(
                    f"[{platform}] Follower count is declining. "
                    f"Review content quality and posting consistency."
                )
            elif rate > 0.1:
                recommendations.append(
                    f"[{platform}] Strong growth ({rate:.1%}). "
                    f"Consider investing more in this platform."
                )

        if not recommendations:
            recommendations.append(
                "Performance is stable. Consider experimenting with new content formats."
            )

        return recommendations
