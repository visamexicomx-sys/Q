"""TikTok platform connector."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

from .base import (
    AccountMetrics,
    Comment,
    PlatformConnector,
    PostMetrics,
    PostResult,
)
from ..config import PlatformCredentials


class TikTokConnector(PlatformConnector):
    """Connector for TikTok Content Posting API."""

    platform_name = "tiktok"
    BASE_URL = "https://open.tiktokapis.com/v2"

    def __init__(self, credentials: PlatformCredentials) -> None:
        super().__init__(credentials)
        self._client: httpx.AsyncClient | None = None

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                timeout=60.0,
                headers={
                    "Authorization": f"Bearer {self.credentials.access_token}",
                    "Content-Type": "application/json",
                },
            )
        return self._client

    async def authenticate(self) -> bool:
        client = await self._ensure_client()
        resp = await client.get(
            "/user/info/",
            params={"fields": "display_name,follower_count"},
        )
        self._authenticated = resp.status_code == 200
        return self._authenticated

    async def publish_post(
        self,
        text: str,
        media_paths: list[str] | None = None,
        **kwargs: Any,
    ) -> PostResult:
        client = await self._ensure_client()

        payload: dict[str, Any] = {
            "post_info": {
                "title": text[:150],
                "privacy_level": kwargs.get("privacy", "PUBLIC_TO_EVERYONE"),
                "disable_duet": kwargs.get("disable_duet", False),
                "disable_comment": kwargs.get("disable_comment", False),
                "disable_stitch": kwargs.get("disable_stitch", False),
            },
            "source_info": {
                "source": "PULL_FROM_URL",
                "video_url": kwargs.get("video_url", ""),
            },
        }

        resp = await client.post("/post/publish/video/init/", json=payload)
        if resp.status_code == 200:
            data = resp.json().get("data", {})
            return PostResult(
                success=True,
                post_id=data.get("publish_id", ""),
                platform=self.platform_name,
                published_at=datetime.now(timezone.utc),
            )
        return PostResult(
            success=False,
            platform=self.platform_name,
            error=f"TikTok API error: {resp.text}",
        )

    async def publish_photo_post(
        self, text: str, photo_urls: list[str], **kwargs: Any
    ) -> PostResult:
        """Publish a photo post (carousel)."""
        client = await self._ensure_client()
        payload = {
            "post_info": {
                "title": text[:150],
                "privacy_level": kwargs.get("privacy", "PUBLIC_TO_EVERYONE"),
            },
            "source_info": {
                "source": "PULL_FROM_URL",
                "photo_urls": photo_urls[:35],
            },
            "post_mode": "DIRECT_POST",
            "media_type": "PHOTO",
        }

        resp = await client.post("/post/publish/content/init/", json=payload)
        if resp.status_code == 200:
            return PostResult(
                success=True,
                post_id=resp.json().get("data", {}).get("publish_id", ""),
                platform=self.platform_name,
                published_at=datetime.now(timezone.utc),
            )
        return PostResult(
            success=False,
            platform=self.platform_name,
            error=resp.text,
        )

    async def delete_post(self, post_id: str) -> bool:
        return False  # TikTok API doesn't support deletion

    async def get_post_metrics(self, post_id: str) -> PostMetrics:
        client = await self._ensure_client()
        resp = await client.post(
            "/video/query/",
            json={"filters": {"video_ids": [post_id]}},
        )
        if resp.status_code != 200:
            return PostMetrics(post_id=post_id, platform=self.platform_name)

        videos = resp.json().get("data", {}).get("videos", [])
        if not videos:
            return PostMetrics(post_id=post_id, platform=self.platform_name)

        v = videos[0]
        return PostMetrics(
            post_id=post_id,
            platform=self.platform_name,
            video_views=v.get("view_count", 0),
            likes=v.get("like_count", 0),
            comments=v.get("comment_count", 0),
            shares=v.get("share_count", 0),
            collected_at=datetime.now(timezone.utc),
        )

    async def get_account_metrics(self) -> AccountMetrics:
        client = await self._ensure_client()
        resp = await client.get(
            "/user/info/",
            params={
                "fields": "follower_count,following_count,video_count,likes_count"
            },
        )
        if resp.status_code != 200:
            return AccountMetrics(platform=self.platform_name)

        data = resp.json().get("data", {}).get("user", {})
        return AccountMetrics(
            platform=self.platform_name,
            followers=data.get("follower_count", 0),
            following=data.get("following_count", 0),
            total_posts=data.get("video_count", 0),
            collected_at=datetime.now(timezone.utc),
        )

    async def get_recent_comments(
        self, post_id: str, limit: int = 50
    ) -> list[Comment]:
        client = await self._ensure_client()
        resp = await client.post(
            "/comment/list/",
            json={"video_id": post_id, "max_count": limit},
        )
        if resp.status_code != 200:
            return []

        return [
            Comment(
                comment_id=c.get("id", ""),
                post_id=post_id,
                platform=self.platform_name,
                author=c.get("user", {}).get("display_name", ""),
                text=c.get("text", ""),
                is_reply=c.get("parent_comment_id", "") != "",
                parent_id=c.get("parent_comment_id", ""),
            )
            for c in resp.json().get("data", {}).get("comments", [])
        ]

    async def reply_to_comment(
        self, post_id: str, comment_id: str, text: str
    ) -> bool:
        return False  # Limited API support

    async def get_trending_topics(self) -> list[dict[str, Any]]:
        client = await self._ensure_client()
        resp = await client.get("/research/hashtag/")
        if resp.status_code != 200:
            return []
        return resp.json().get("data", {}).get("hashtags", [])

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
