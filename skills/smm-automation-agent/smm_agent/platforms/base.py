"""Abstract base class for platform connectors."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any

from ..config import PlatformCredentials


class PostStatus(Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    FAILED = "failed"
    DELETED = "deleted"


@dataclass
class PostResult:
    """Result of a post operation."""

    success: bool
    post_id: str = ""
    url: str = ""
    error: str = ""
    platform: str = ""
    published_at: datetime | None = None
    raw_response: dict[str, Any] = field(default_factory=dict)


@dataclass
class PostMetrics:
    """Engagement metrics for a post."""

    post_id: str = ""
    platform: str = ""
    impressions: int = 0
    reach: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    saves: int = 0
    clicks: int = 0
    video_views: int = 0
    engagement_rate: float = 0.0
    collected_at: datetime | None = None


@dataclass
class AccountMetrics:
    """Account-level metrics."""

    platform: str = ""
    followers: int = 0
    following: int = 0
    total_posts: int = 0
    avg_engagement_rate: float = 0.0
    follower_growth_rate: float = 0.0
    collected_at: datetime | None = None


@dataclass
class Comment:
    """A comment or reply on a post."""

    comment_id: str = ""
    post_id: str = ""
    platform: str = ""
    author: str = ""
    text: str = ""
    sentiment: str = ""
    created_at: datetime | None = None
    is_reply: bool = False
    parent_id: str = ""


class PlatformConnector(ABC):
    """Abstract base class for all platform connectors."""

    platform_name: str = ""

    def __init__(self, credentials: PlatformCredentials) -> None:
        self.credentials = credentials
        self._authenticated = False

    @abstractmethod
    async def authenticate(self) -> bool:
        """Authenticate with the platform API."""
        ...

    @abstractmethod
    async def publish_post(
        self,
        text: str,
        media_paths: list[str] | None = None,
        **kwargs: Any,
    ) -> PostResult:
        """Publish a post to the platform."""
        ...

    @abstractmethod
    async def delete_post(self, post_id: str) -> bool:
        """Delete a post by ID."""
        ...

    @abstractmethod
    async def get_post_metrics(self, post_id: str) -> PostMetrics:
        """Get engagement metrics for a specific post."""
        ...

    @abstractmethod
    async def get_account_metrics(self) -> AccountMetrics:
        """Get account-level metrics."""
        ...

    @abstractmethod
    async def get_recent_comments(
        self, post_id: str, limit: int = 50
    ) -> list[Comment]:
        """Get recent comments on a post."""
        ...

    @abstractmethod
    async def reply_to_comment(
        self, post_id: str, comment_id: str, text: str
    ) -> bool:
        """Reply to a comment on a post."""
        ...

    @abstractmethod
    async def get_trending_topics(self) -> list[dict[str, Any]]:
        """Get current trending topics/hashtags."""
        ...

    async def schedule_post(
        self,
        text: str,
        publish_at: datetime,
        media_paths: list[str] | None = None,
        **kwargs: Any,
    ) -> PostResult:
        """Schedule a post for future publishing (platform-native if supported)."""
        # Default: store in local queue; subclasses override for native scheduling
        return PostResult(
            success=True,
            platform=self.platform_name,
            error="Native scheduling not supported; using local scheduler.",
        )

    async def get_audience_insights(self) -> dict[str, Any]:
        """Get audience demographics and behavior insights."""
        return {}

    async def health_check(self) -> bool:
        """Check if the platform connection is healthy."""
        try:
            await self.authenticate()
            return True
        except Exception:
            return False
