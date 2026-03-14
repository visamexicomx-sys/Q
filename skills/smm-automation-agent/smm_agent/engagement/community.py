"""Community management tools."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class CommunityMember:
    """A tracked community member."""

    username: str
    platform: str
    interaction_count: int = 0
    first_seen: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_interaction: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    sentiment_score: float = 0.0  # -1.0 to 1.0
    is_influencer: bool = False
    follower_count: int = 0
    tags: list[str] = field(default_factory=list)


class CommunityManager:
    """Manage community interactions and relationships."""

    def __init__(self) -> None:
        self.members: dict[str, CommunityMember] = {}
        self._interaction_log: list[dict[str, Any]] = []

    def track_interaction(
        self,
        username: str,
        platform: str,
        interaction_type: str,
        sentiment: float = 0.0,
    ) -> CommunityMember:
        """Track an interaction with a community member."""
        key = f"{platform}:{username}"

        if key not in self.members:
            self.members[key] = CommunityMember(
                username=username,
                platform=platform,
            )

        member = self.members[key]
        member.interaction_count += 1
        member.last_interaction = datetime.now(timezone.utc)
        member.sentiment_score = (
            member.sentiment_score * 0.8 + sentiment * 0.2
        )

        self._interaction_log.append({
            "username": username,
            "platform": platform,
            "type": interaction_type,
            "sentiment": sentiment,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        return member

    def get_top_engagers(
        self, platform: str = "", limit: int = 20
    ) -> list[CommunityMember]:
        """Get most active community members."""
        members = list(self.members.values())
        if platform:
            members = [m for m in members if m.platform == platform]
        members.sort(key=lambda m: m.interaction_count, reverse=True)
        return members[:limit]

    def get_influencers(
        self, min_followers: int = 10000
    ) -> list[CommunityMember]:
        """Get community members who are influencers."""
        return [
            m for m in self.members.values()
            if m.is_influencer or m.follower_count >= min_followers
        ]

    def get_at_risk_members(self) -> list[CommunityMember]:
        """Get members with declining sentiment."""
        return [
            m for m in self.members.values()
            if m.sentiment_score < -0.3 and m.interaction_count >= 3
        ]

    def generate_welcome_message(
        self, username: str, platform: str
    ) -> str:
        """Generate a personalized welcome message for a new follower."""
        messages = [
            f"Welcome to our community, @{username}! We're excited to have you here. Stay tuned for valuable content!",
            f"Hey @{username}! Thanks for joining us! Feel free to reach out anytime.",
            f"Welcome aboard, @{username}! Glad to have you in the community.",
        ]

        import random
        return random.choice(messages)

    def get_community_health(self) -> dict[str, Any]:
        """Get overall community health metrics."""
        if not self.members:
            return {"status": "no_data", "total_members": 0}

        all_members = list(self.members.values())
        total = len(all_members)
        avg_sentiment = sum(m.sentiment_score for m in all_members) / total
        active_count = sum(
            1 for m in all_members if m.interaction_count >= 3
        )

        return {
            "total_tracked_members": total,
            "active_members": active_count,
            "avg_sentiment": round(avg_sentiment, 2),
            "influencer_count": len(self.get_influencers()),
            "at_risk_count": len(self.get_at_risk_members()),
            "health_score": min(max(avg_sentiment + 0.5, 0), 1.0),
        }
