"""Hashtag research and optimization engine."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Any

from ..config import PLATFORM_LIMITS, SMMConfig


@dataclass
class HashtagData:
    """Data for a single hashtag."""

    tag: str
    category: str  # brand, campaign, industry, trending, niche, location
    estimated_volume: int = 0
    competition: str = "medium"  # low, medium, high
    relevance_score: float = 0.0


class HashtagEngine:
    """Hashtag research and optimization engine."""

    def __init__(self, config: SMMConfig) -> None:
        self.config = config
        self._cache: dict[str, list[HashtagData]] = {}

    def generate_hashtags(
        self,
        topic: str,
        platform: str,
        count: int | None = None,
    ) -> list[str]:
        """Generate an optimized hashtag set for a post."""
        limits = PLATFORM_LIMITS.get(platform, {})
        max_hashtags = count or limits.get("recommended_hashtags", 5)

        hashtags: list[HashtagData] = []

        # Brand hashtags (1-2)
        brand_tags = self._get_brand_hashtags()
        hashtags.extend(brand_tags[:2])

        # Industry hashtags (3-5)
        industry_tags = self._get_industry_hashtags(topic)
        hashtags.extend(industry_tags[:5])

        # Niche hashtags (3-5)
        niche_tags = self._get_niche_hashtags(topic)
        hashtags.extend(niche_tags[:5])

        # Trending hashtags (1-2)
        trending_tags = self._get_trending_hashtags(topic)
        hashtags.extend(trending_tags[:2])

        # Location hashtags (0-2)
        if self.config.audience.locations:
            loc_tags = self._get_location_hashtags()
            hashtags.extend(loc_tags[:2])

        # Deduplicate and trim to count
        seen: set[str] = set()
        unique: list[str] = []
        for h in hashtags:
            if h.tag.lower() not in seen:
                seen.add(h.tag.lower())
                unique.append(h.tag)

        return unique[:max_hashtags]

    def research_hashtags(
        self, seed_keywords: list[str], platform: str
    ) -> list[HashtagData]:
        """Research hashtags from seed keywords."""
        results: list[HashtagData] = []

        for keyword in seed_keywords:
            keyword_clean = keyword.strip().replace(" ", "").replace("#", "")

            # Direct hashtag
            results.append(HashtagData(
                tag=keyword_clean,
                category="industry",
                estimated_volume=random.randint(10000, 1000000),
                competition=random.choice(["low", "medium", "high"]),
                relevance_score=0.9,
            ))

            # Variations
            variations = self._expand_hashtag(keyword_clean)
            for v in variations:
                results.append(HashtagData(
                    tag=v,
                    category="niche",
                    estimated_volume=random.randint(1000, 100000),
                    competition="low",
                    relevance_score=0.7,
                ))

        # Sort by relevance
        results.sort(key=lambda h: h.relevance_score, reverse=True)
        return results

    def analyze_hashtag_performance(
        self, hashtags: list[str], engagement_data: dict[str, float]
    ) -> dict[str, dict[str, Any]]:
        """Analyze which hashtags drive the most engagement."""
        analysis: dict[str, dict[str, Any]] = {}

        for tag in hashtags:
            avg_engagement = engagement_data.get(tag, 0.0)
            analysis[tag] = {
                "avg_engagement": avg_engagement,
                "recommendation": (
                    "keep" if avg_engagement > 0.03
                    else "test_more" if avg_engagement > 0.01
                    else "replace"
                ),
            }

        return analysis

    def get_banned_hashtags(self, platform: str) -> set[str]:
        """Return hashtags that are shadowbanned or restricted on a platform."""
        # Common restricted hashtags (platform-specific lists would be maintained)
        return {
            "follow4follow", "f4f", "like4like", "l4l",
            "followback", "followme", "instalike",
        }

    def _get_brand_hashtags(self) -> list[HashtagData]:
        """Get brand-specific hashtags."""
        brand = self.config.brand.name.replace(" ", "")
        tags = [
            HashtagData(tag=brand, category="brand", relevance_score=1.0),
        ]
        if self.config.brand.tagline:
            tagline_tag = self.config.brand.tagline.replace(" ", "")
            tags.append(HashtagData(
                tag=tagline_tag, category="brand", relevance_score=0.95
            ))
        return tags

    def _get_industry_hashtags(self, topic: str) -> list[HashtagData]:
        """Get industry-relevant hashtags."""
        topic_clean = topic.replace(" ", "")
        industry = self.config.brand.industry.replace(" ", "") or "business"

        base_tags = [
            topic_clean,
            industry,
            f"{topic_clean}Tips",
            f"{industry}Growth",
            f"{topic_clean}Strategy",
        ]

        return [
            HashtagData(
                tag=tag,
                category="industry",
                estimated_volume=random.randint(50000, 500000),
                competition="medium",
                relevance_score=0.8,
            )
            for tag in base_tags
        ]

    def _get_niche_hashtags(self, topic: str) -> list[HashtagData]:
        """Get niche/long-tail hashtags."""
        topic_clean = topic.replace(" ", "")
        niche_suffixes = [
            "Community", "Life", "Daily", "Hacks", "Advice",
            "Insights", "Trends", "Expert", "Mastery",
        ]

        return [
            HashtagData(
                tag=f"{topic_clean}{suffix}",
                category="niche",
                estimated_volume=random.randint(1000, 50000),
                competition="low",
                relevance_score=0.7,
            )
            for suffix in random.sample(niche_suffixes, min(5, len(niche_suffixes)))
        ]

    def _get_trending_hashtags(self, topic: str) -> list[HashtagData]:
        """Get currently trending relevant hashtags."""
        trending_generic = [
            "Trending", "Viral", "MustRead", "GameChanger",
            "Innovation", "FutureOf",
        ]

        return [
            HashtagData(
                tag=tag,
                category="trending",
                estimated_volume=random.randint(100000, 5000000),
                competition="high",
                relevance_score=0.5,
            )
            for tag in random.sample(trending_generic, 2)
        ]

    def _get_location_hashtags(self) -> list[HashtagData]:
        """Get location-based hashtags."""
        locations = self.config.audience.locations or ["Global"]
        return [
            HashtagData(
                tag=loc.replace(" ", "").replace(",", ""),
                category="location",
                estimated_volume=random.randint(10000, 200000),
                competition="medium",
                relevance_score=0.6,
            )
            for loc in locations[:2]
        ]

    def _expand_hashtag(self, keyword: str) -> list[str]:
        """Expand a keyword into related hashtags."""
        expansions = [
            f"{keyword}Tips",
            f"{keyword}101",
            f"{keyword}Community",
            f"Learn{keyword}",
            f"{keyword}Life",
        ]
        return random.sample(expansions, min(3, len(expansions)))
