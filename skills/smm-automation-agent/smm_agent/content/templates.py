"""Content templates library for various post types."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class ContentTemplate:
    """A reusable content template."""

    name: str
    platform: str
    content_type: str
    template: str
    variables: list[str]
    example: str = ""


TEMPLATES: list[ContentTemplate] = [
    # Twitter/X
    ContentTemplate(
        name="twitter_tip",
        platform="twitter",
        content_type="educational",
        template="{hook}\n\n{tip}\n\n{cta}",
        variables=["hook", "tip", "cta"],
        example="Most people overcomplicate SEO.\n\nHere's the truth: Write for humans first, optimize for bots second.\n\nFollow for more marketing tips.",
    ),
    ContentTemplate(
        name="twitter_thread_hook",
        platform="twitter",
        content_type="educational",
        template="{hook}\n\n🧵 A thread on {topic}:",
        variables=["hook", "topic"],
    ),
    ContentTemplate(
        name="twitter_poll",
        platform="twitter",
        content_type="engagement",
        template="{question}",
        variables=["question"],
    ),
    # Instagram
    ContentTemplate(
        name="instagram_carousel_caption",
        platform="instagram",
        content_type="educational",
        template="{hook}\n\n{body}\n\n{cta}\n\n.\n.\n.\n{hashtags}",
        variables=["hook", "body", "cta", "hashtags"],
    ),
    ContentTemplate(
        name="instagram_reel_caption",
        platform="instagram",
        content_type="engagement",
        template="{hook} 👆\n\n{description}\n\n{cta}\n\n{hashtags}",
        variables=["hook", "description", "cta", "hashtags"],
    ),
    ContentTemplate(
        name="instagram_story_text",
        platform="instagram",
        content_type="engagement",
        template="{question}\n\nTap to vote 👆",
        variables=["question"],
    ),
    # LinkedIn
    ContentTemplate(
        name="linkedin_thought_leadership",
        platform="linkedin",
        content_type="educational",
        template="{hook}\n\n{story}\n\n{insight}\n\n{takeaway}\n\n{cta}\n\n{hashtags}",
        variables=["hook", "story", "insight", "takeaway", "cta", "hashtags"],
    ),
    ContentTemplate(
        name="linkedin_document_post",
        platform="linkedin",
        content_type="educational",
        template="{hook}\n\n📄 Swipe through for the full breakdown.\n\n{summary}\n\n{cta}",
        variables=["hook", "summary", "cta"],
    ),
    ContentTemplate(
        name="linkedin_personal_story",
        platform="linkedin",
        content_type="behind_the_scenes",
        template="{opening}\n\n{story}\n\n{lesson}\n\n{cta}",
        variables=["opening", "story", "lesson", "cta"],
    ),
    # Facebook
    ContentTemplate(
        name="facebook_engagement_post",
        platform="facebook",
        content_type="engagement",
        template="{hook}\n\n{body}\n\n{question}\n\n{hashtags}",
        variables=["hook", "body", "question", "hashtags"],
    ),
    ContentTemplate(
        name="facebook_event_promo",
        platform="facebook",
        content_type="promotional",
        template="🎉 {event_name}\n\n📅 {date}\n📍 {location}\n\n{description}\n\n{cta}",
        variables=["event_name", "date", "location", "description", "cta"],
    ),
    # TikTok
    ContentTemplate(
        name="tiktok_caption",
        platform="tiktok",
        content_type="engagement",
        template="{hook} 👀\n\n{body}\n\n{hashtags}",
        variables=["hook", "body", "hashtags"],
    ),
    # Pinterest
    ContentTemplate(
        name="pinterest_pin",
        platform="pinterest",
        content_type="educational",
        template="{title}\n\n{description}\n\n{cta}\n\n{hashtags}",
        variables=["title", "description", "cta", "hashtags"],
    ),
    # Product Launch (cross-platform)
    ContentTemplate(
        name="product_launch",
        platform="all",
        content_type="promotional",
        template="🚀 Introducing {product_name}\n\n{one_liner}\n\nWhy it matters:\n→ {benefit_1}\n→ {benefit_2}\n→ {benefit_3}\n\n{cta}",
        variables=["product_name", "one_liner", "benefit_1", "benefit_2", "benefit_3", "cta"],
    ),
    # Testimonial (cross-platform)
    ContentTemplate(
        name="customer_testimonial",
        platform="all",
        content_type="promotional",
        template="\"{quote}\"\n\n— {customer_name}, {customer_title}\n\n{context}\n\n{cta}",
        variables=["quote", "customer_name", "customer_title", "context", "cta"],
    ),
]


def get_templates(
    platform: str = "",
    content_type: str = "",
) -> list[ContentTemplate]:
    """Get templates filtered by platform and/or content type."""
    results = TEMPLATES
    if platform:
        results = [t for t in results if t.platform in (platform, "all")]
    if content_type:
        results = [t for t in results if t.content_type == content_type]
    return results


def render_template(
    template: ContentTemplate,
    variables: dict[str, str],
) -> str:
    """Render a template with provided variables."""
    text = template.template
    for key, value in variables.items():
        text = text.replace(f"{{{key}}}", value)
    return text
