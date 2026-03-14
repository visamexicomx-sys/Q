"""Configuration management for SMM Automation Agent."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel


load_dotenv()


class PlatformCredentials(BaseModel):
    """API credentials for a single platform."""

    api_key: str = ""
    api_secret: str = ""
    access_token: str = ""
    access_token_secret: str = ""
    bearer_token: str = ""
    client_id: str = ""
    client_secret: str = ""
    app_id: str = ""
    app_secret: str = ""
    business_account_id: str = ""
    page_id: str = ""


class BrandConfig(BaseModel):
    """Brand identity configuration."""

    name: str = ""
    voice: str = "professional"
    values: list[str] = field(default_factory=list)
    visual_style: str = ""
    tagline: str = ""
    industry: str = ""
    website: str = ""


class AudienceConfig(BaseModel):
    """Target audience configuration."""

    demographics: dict[str, Any] = field(default_factory=dict)
    interests: list[str] = field(default_factory=list)
    pain_points: list[str] = field(default_factory=list)
    platforms: list[str] = field(default_factory=list)
    locations: list[str] = field(default_factory=list)
    languages: list[str] = field(default_factory=lambda: ["en"])


class ContentPillar(BaseModel):
    """Content pillar definition."""

    name: str
    weight: float = 0.2
    formats: list[str] = field(default_factory=list)
    tone: str = "professional"
    topics: list[str] = field(default_factory=list)


class ScheduleConfig(BaseModel):
    """Posting schedule configuration."""

    posts_per_day: dict[str, int] = field(default_factory=dict)
    timezone: str = "UTC"
    blackout_hours: list[int] = field(default_factory=list)
    weekend_posting: bool = True


class SMMConfig(BaseModel):
    """Root configuration for the SMM Agent."""

    brand: BrandConfig = BrandConfig()
    audience: AudienceConfig = AudienceConfig()
    content_pillars: list[ContentPillar] = field(default_factory=list)
    schedule: ScheduleConfig = ScheduleConfig()
    platforms: list[str] = field(default_factory=list)
    competitors: list[str] = field(default_factory=list)
    goals: dict[str, Any] = field(default_factory=dict)
    auto_engage: bool = True
    auto_publish: bool = False
    approval_required: bool = True
    database_url: str = "sqlite:///smm_agent.db"
    redis_url: str = "redis://localhost:6379"


def load_config(config_path: str | Path | None = None) -> SMMConfig:
    """Load configuration from YAML file and environment variables."""
    config_data: dict[str, Any] = {}

    if config_path and Path(config_path).exists():
        with open(config_path) as f:
            config_data = yaml.safe_load(f) or {}

    # Override with environment variables
    if os.getenv("DATABASE_URL"):
        config_data["database_url"] = os.getenv("DATABASE_URL")
    if os.getenv("REDIS_URL"):
        config_data["redis_url"] = os.getenv("REDIS_URL")

    return SMMConfig(**config_data)


def get_platform_credentials(platform: str) -> PlatformCredentials:
    """Load platform-specific credentials from environment variables."""
    prefix_map = {
        "twitter": "TWITTER",
        "instagram": "META",
        "facebook": "META",
        "linkedin": "LINKEDIN",
        "tiktok": "TIKTOK",
        "youtube": "YOUTUBE",
        "pinterest": "PINTEREST",
        "threads": "THREADS",
    }

    prefix = prefix_map.get(platform, platform.upper())

    return PlatformCredentials(
        api_key=os.getenv(f"{prefix}_API_KEY", ""),
        api_secret=os.getenv(f"{prefix}_API_SECRET", ""),
        access_token=os.getenv(f"{prefix}_ACCESS_TOKEN", ""),
        access_token_secret=os.getenv(f"{prefix}_ACCESS_TOKEN_SECRET", ""),
        bearer_token=os.getenv(f"{prefix}_BEARER_TOKEN", ""),
        client_id=os.getenv(f"{prefix}_CLIENT_ID", ""),
        client_secret=os.getenv(f"{prefix}_CLIENT_SECRET", ""),
        app_id=os.getenv(f"{prefix}_APP_ID", os.getenv("META_APP_ID", "")),
        app_secret=os.getenv(f"{prefix}_APP_SECRET", os.getenv("META_APP_SECRET", "")),
        business_account_id=os.getenv(f"INSTAGRAM_BUSINESS_ACCOUNT_ID", ""),
        page_id=os.getenv(f"FACEBOOK_PAGE_ID", ""),
    )


PLATFORM_LIMITS = {
    "twitter": {
        "max_chars": 280,
        "max_hashtags": 10,
        "recommended_hashtags": 3,
        "max_images": 4,
        "max_video_length": 140,
        "image_formats": ["jpg", "png", "gif", "webp"],
    },
    "instagram": {
        "max_chars": 2200,
        "max_hashtags": 30,
        "recommended_hashtags": 12,
        "max_images": 10,
        "max_video_length": 90,
        "image_formats": ["jpg", "png"],
        "story_max_seconds": 60,
        "reel_max_seconds": 90,
    },
    "linkedin": {
        "max_chars": 3000,
        "max_hashtags": 30,
        "recommended_hashtags": 5,
        "max_images": 9,
        "max_video_length": 600,
        "article_max_chars": 120000,
    },
    "facebook": {
        "max_chars": 63206,
        "max_hashtags": 30,
        "recommended_hashtags": 3,
        "max_images": 10,
        "max_video_length": 14400,
    },
    "tiktok": {
        "max_chars": 2200,
        "max_hashtags": 100,
        "recommended_hashtags": 5,
        "max_video_length": 600,
    },
    "youtube": {
        "title_max_chars": 100,
        "description_max_chars": 5000,
        "max_tags": 500,
        "shorts_max_seconds": 60,
    },
    "pinterest": {
        "title_max_chars": 100,
        "description_max_chars": 500,
        "max_hashtags": 20,
        "recommended_hashtags": 5,
    },
    "threads": {
        "max_chars": 500,
        "max_hashtags": 10,
        "recommended_hashtags": 3,
        "max_images": 10,
    },
}
