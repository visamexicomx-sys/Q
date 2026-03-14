"""AI-powered content generation engine."""

from __future__ import annotations

import json
import random
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from ..config import PLATFORM_LIMITS, SMMConfig


@dataclass
class GeneratedPost:
    """A generated social media post."""

    text: str
    platform: str
    content_type: str  # educational, engagement, promotional, etc.
    content_format: str  # tip, poll, question, product-highlight, etc.
    hashtags: list[str] = field(default_factory=list)
    media_prompts: list[str] = field(default_factory=list)
    cta: str = ""
    variant: str = "A"
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def full_text(self) -> str:
        """Get full post text with hashtags."""
        parts = [self.text]
        if self.hashtags:
            parts.append("\n\n" + " ".join(f"#{h}" for h in self.hashtags))
        return "".join(parts)


CONTENT_FORMATS = {
    "educational": [
        "tip", "how-to", "explainer", "myth-busting", "listicle",
        "comparison", "case-study", "stat-highlight", "framework",
    ],
    "engagement": [
        "poll", "question", "challenge", "ugc-prompt", "this-or-that",
        "fill-in-the-blank", "hot-take", "debate",
    ],
    "promotional": [
        "product-highlight", "testimonial", "offer", "feature-announcement",
        "demo", "before-after", "social-proof",
    ],
    "behind_the_scenes": [
        "team-spotlight", "process-reveal", "milestone", "culture",
        "day-in-life", "bloopers", "workspace",
    ],
    "trending": [
        "newsjacking", "trend-commentary", "meme", "seasonal",
        "industry-news", "prediction",
    ],
}

HOOKS = {
    "curiosity": [
        "Most people don't know this about {topic}...",
        "Here's what nobody tells you about {topic}:",
        "I spent {time} studying {topic}. Here's what I found:",
        "The {topic} mistake that's costing you {outcome}:",
    ],
    "contrarian": [
        "Unpopular opinion: {claim}",
        "Stop doing {common_practice}. Here's why:",
        "{common_advice} is terrible advice. Here's what works instead:",
        "Everyone is wrong about {topic}.",
    ],
    "value": [
        "{number} {topic} tips that actually work:",
        "How to {outcome} in {timeframe} (step-by-step):",
        "The exact {topic} strategy I used to {result}:",
        "Free {topic} framework that took me {time} to build:",
    ],
    "story": [
        "Last {time}, something changed everything for me...",
        "I almost gave up on {topic}. Then this happened:",
        "A {person} taught me the most important lesson about {topic}:",
        "3 years ago I was {situation}. Today I {result}.",
    ],
    "stat": [
        "{percentage}% of {group} make this {topic} mistake.",
        "The {topic} industry will be worth ${amount} by {year}.",
        "Only {percentage}% of {group} know about {topic}.",
    ],
}

CTA_TEMPLATES = [
    "Follow for more {topic} tips.",
    "Save this for later.",
    "Share with someone who needs this.",
    "Drop a {emoji} if you agree.",
    "What's your take? Comment below.",
    "Link in bio for the full guide.",
    "Repost to help your network.",
    "Tag someone who should see this.",
    "Try this today and tell me how it goes.",
    "DM me '{keyword}' for the free template.",
]


class ContentGenerator:
    """AI-powered content generation engine."""

    def __init__(self, config: SMMConfig) -> None:
        self.config = config
        self._generated_hashes: set[str] = set()

    def generate_post(
        self,
        platform: str,
        pillar: str = "",
        content_format: str = "",
        topic: str = "",
        **kwargs: Any,
    ) -> GeneratedPost:
        """Generate a single post for a platform."""
        if not pillar:
            pillar = self._select_pillar()
        if not content_format:
            formats = CONTENT_FORMATS.get(pillar, CONTENT_FORMATS["educational"])
            content_format = random.choice(formats)

        limits = PLATFORM_LIMITS.get(platform, {})
        max_chars = limits.get("max_chars", 280)

        # Build post based on format
        hook = self._generate_hook(pillar, topic or self.config.brand.industry)
        body = self._generate_body(content_format, topic, platform)
        cta = random.choice(CTA_TEMPLATES).format(
            topic=topic or self.config.brand.industry,
            emoji="🔥",
            keyword="guide",
        )

        full_text = f"{hook}\n\n{body}\n\n{cta}"

        # Trim to platform limits
        if len(full_text) > max_chars:
            full_text = full_text[: max_chars - 3] + "..."

        # Generate hashtags
        from .hashtags import HashtagEngine
        hashtag_engine = HashtagEngine(self.config)
        hashtags = hashtag_engine.generate_hashtags(
            topic or self.config.brand.industry, platform
        )

        post = GeneratedPost(
            text=full_text,
            platform=platform,
            content_type=pillar,
            content_format=content_format,
            hashtags=hashtags,
            cta=cta,
            media_prompts=self._generate_media_prompts(content_format, topic),
        )

        self._generated_hashes.add(hash(post.text))
        return post

    def generate_batch(
        self,
        platform: str,
        count: int = 5,
        pillar: str = "",
        topic: str = "",
    ) -> list[GeneratedPost]:
        """Generate a batch of posts."""
        posts: list[GeneratedPost] = []
        used_formats: set[str] = set()

        for i in range(count):
            content_format = ""
            if pillar:
                formats = CONTENT_FORMATS.get(pillar, [])
                available = [f for f in formats if f not in used_formats]
                if available:
                    content_format = random.choice(available)
                    used_formats.add(content_format)

            post = self.generate_post(
                platform,
                pillar=pillar,
                content_format=content_format,
                topic=topic,
            )
            post.variant = chr(65 + i)  # A, B, C...
            posts.append(post)

        return posts

    def generate_thread(
        self,
        platform: str,
        topic: str,
        num_posts: int = 5,
    ) -> list[GeneratedPost]:
        """Generate a thread/carousel sequence."""
        posts: list[GeneratedPost] = []

        # Hook post
        hook = self._generate_hook("educational", topic)
        posts.append(GeneratedPost(
            text=f"{hook}\n\n🧵 Thread:",
            platform=platform,
            content_type="educational",
            content_format="thread",
            variant="hook",
        ))

        # Content posts
        for i in range(num_posts - 2):
            posts.append(GeneratedPost(
                text=f"{i + 1}/ {self._generate_body('tip', topic, platform)}",
                platform=platform,
                content_type="educational",
                content_format="thread",
                variant=f"part_{i + 1}",
            ))

        # Closing CTA
        cta = random.choice(CTA_TEMPLATES).format(
            topic=topic, emoji="🔥", keyword="guide"
        )
        posts.append(GeneratedPost(
            text=f"That's a wrap!\n\n{cta}\n\nFollow for more {topic} content.",
            platform=platform,
            content_type="educational",
            content_format="thread",
            variant="cta",
        ))

        return posts

    def generate_ab_variants(
        self,
        platform: str,
        topic: str,
        variable: str = "hook",
        num_variants: int = 2,
    ) -> list[GeneratedPost]:
        """Generate A/B test variants."""
        variants: list[GeneratedPost] = []

        for i in range(num_variants):
            post = self.generate_post(platform, topic=topic)
            post.variant = chr(65 + i)
            post.metadata["ab_test"] = True
            post.metadata["ab_variable"] = variable
            variants.append(post)

        return variants

    def adapt_for_platform(
        self, post: GeneratedPost, target_platform: str
    ) -> GeneratedPost:
        """Adapt a post for a different platform."""
        limits = PLATFORM_LIMITS.get(target_platform, {})
        max_chars = limits.get("max_chars", 280)

        text = post.text
        if len(text) > max_chars:
            text = text[: max_chars - 3] + "..."

        from .hashtags import HashtagEngine
        hashtag_engine = HashtagEngine(self.config)
        hashtags = hashtag_engine.generate_hashtags(
            self.config.brand.industry, target_platform
        )

        return GeneratedPost(
            text=text,
            platform=target_platform,
            content_type=post.content_type,
            content_format=post.content_format,
            hashtags=hashtags,
            cta=post.cta,
            media_prompts=post.media_prompts,
            variant=post.variant,
        )

    def _select_pillar(self) -> str:
        """Select a content pillar based on weights."""
        if not self.config.content_pillars:
            return random.choice(list(CONTENT_FORMATS.keys()))

        pillars = self.config.content_pillars
        weights = [p.weight for p in pillars]
        total = sum(weights)
        weights = [w / total for w in weights]

        r = random.random()
        cumulative = 0
        for pillar, weight in zip(pillars, weights):
            cumulative += weight
            if r <= cumulative:
                return pillar.name
        return pillars[-1].name

    def _generate_hook(self, pillar: str, topic: str) -> str:
        """Generate a scroll-stopping hook."""
        hook_type = random.choice(list(HOOKS.keys()))
        templates = HOOKS[hook_type]
        template = random.choice(templates)

        return template.format(
            topic=topic or "business",
            claim=f"{topic} is overrated",
            common_practice=f"traditional {topic} methods",
            common_advice=f"Follow the {topic} playbook",
            outcome="growth",
            number=random.choice([3, 5, 7, 10]),
            timeframe="30 days",
            result="10x growth",
            time="6 months",
            person="mentor",
            situation="struggling",
            percentage=random.choice([73, 87, 91, 95]),
            group="businesses",
            amount="500B",
            year="2027",
            emoji="🔥",
        )

    def _generate_body(
        self, content_format: str, topic: str, platform: str
    ) -> str:
        """Generate the body content based on format."""
        topic = topic or "business growth"

        bodies = {
            "tip": f"Here's a simple way to improve your {topic}: Focus on consistency over perfection. The best strategy is the one you actually execute.",
            "how-to": f"Step 1: Audit your current {topic} approach\nStep 2: Identify the biggest gap\nStep 3: Fix that one thing first\nStep 4: Measure and iterate",
            "poll": f"What's your biggest {topic} challenge?\n\nA) Getting started\nB) Staying consistent\nC) Measuring results\nD) Scaling what works",
            "question": f"What's one thing about {topic} you wish you knew sooner?",
            "product-highlight": f"We built this because {topic} shouldn't be this hard. Our solution makes it effortless.",
            "testimonial": f"\"Since implementing this {topic} strategy, we've seen incredible results.\" — Happy Customer",
            "stat-highlight": f"Companies that invest in {topic} see 3x better results than those that don't.",
            "listicle": f"Top ways to level up your {topic}:\n→ Be consistent\n→ Track everything\n→ Learn from data\n→ Iterate fast",
            "myth-busting": f"Myth: {topic} requires a huge budget.\nReality: The best results come from strategy, not spend.",
            "challenge": f"Try this {topic} challenge for the next 7 days and watch what happens.",
        }

        return bodies.get(content_format, bodies["tip"])

    def _generate_media_prompts(
        self, content_format: str, topic: str
    ) -> list[str]:
        """Generate media/image prompts for the post."""
        topic = topic or "business"
        return [
            f"Professional, clean social media graphic about {topic}. "
            f"Modern design, brand colors, minimalist style. "
            f"Format: {content_format}."
        ]
