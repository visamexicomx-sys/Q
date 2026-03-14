"""Platform connectors package."""

from .base import PlatformConnector, PostResult, PostMetrics, AccountMetrics, Comment
from .twitter import TwitterConnector
from .instagram import InstagramConnector
from .linkedin import LinkedInConnector
from .facebook import FacebookConnector
from .tiktok import TikTokConnector
from .youtube import YouTubeConnector
from .pinterest import PinterestConnector
from .threads import ThreadsConnector

PLATFORM_CONNECTORS: dict[str, type[PlatformConnector]] = {
    "twitter": TwitterConnector,
    "instagram": InstagramConnector,
    "linkedin": LinkedInConnector,
    "facebook": FacebookConnector,
    "tiktok": TikTokConnector,
    "youtube": YouTubeConnector,
    "pinterest": PinterestConnector,
    "threads": ThreadsConnector,
}


def get_connector(platform: str, credentials) -> PlatformConnector:
    """Get a platform connector instance by name."""
    connector_cls = PLATFORM_CONNECTORS.get(platform)
    if not connector_cls:
        raise ValueError(f"Unknown platform: {platform}")
    return connector_cls(credentials)


__all__ = [
    "PlatformConnector",
    "PostResult",
    "PostMetrics",
    "AccountMetrics",
    "Comment",
    "TwitterConnector",
    "InstagramConnector",
    "LinkedInConnector",
    "FacebookConnector",
    "TikTokConnector",
    "YouTubeConnector",
    "PinterestConnector",
    "ThreadsConnector",
    "PLATFORM_CONNECTORS",
    "get_connector",
]
