"""YouTube platform connector."""

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


class YouTubeConnector(PlatformConnector):
    """Connector for YouTube Data API v3."""

    platform_name = "youtube"
    BASE_URL = "https://www.googleapis.com/youtube/v3"

    def __init__(self, credentials: PlatformCredentials) -> None:
        super().__init__(credentials)
        self._client: httpx.AsyncClient | None = None
        self._channel_id: str = ""

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                timeout=30.0,
                headers={"Authorization": f"Bearer {self.credentials.access_token}"},
            )
        return self._client

    async def authenticate(self) -> bool:
        client = await self._ensure_client()
        resp = await client.get(
            "/channels", params={"part": "id", "mine": "true"}
        )
        if resp.status_code == 200:
            items = resp.json().get("items", [])
            if items:
                self._channel_id = items[0]["id"]
                self._authenticated = True
                return True
        return False

    async def publish_post(
        self,
        text: str,
        media_paths: list[str] | None = None,
        **kwargs: Any,
    ) -> PostResult:
        """Create a community post or upload video metadata."""
        client = await self._ensure_client()

        # Community post
        resp = await client.post(
            "/commentThreads",
            params={"part": "snippet"},
            json={
                "snippet": {
                    "channelId": self._channel_id,
                    "topLevelComment": {
                        "snippet": {"textOriginal": text}
                    },
                }
            },
        )

        if resp.status_code in (200, 201):
            return PostResult(
                success=True,
                post_id=resp.json().get("id", ""),
                platform=self.platform_name,
                published_at=datetime.now(timezone.utc),
            )
        return PostResult(
            success=False,
            platform=self.platform_name,
            error=resp.text,
        )

    async def update_video_metadata(
        self,
        video_id: str,
        title: str = "",
        description: str = "",
        tags: list[str] | None = None,
    ) -> bool:
        """Update video title, description, and tags."""
        client = await self._ensure_client()
        body: dict[str, Any] = {
            "id": video_id,
            "snippet": {},
        }
        if title:
            body["snippet"]["title"] = title[:100]
        if description:
            body["snippet"]["description"] = description[:5000]
        if tags:
            body["snippet"]["tags"] = tags

        resp = await client.put(
            "/videos", params={"part": "snippet"}, json=body
        )
        return resp.status_code == 200

    async def delete_post(self, post_id: str) -> bool:
        client = await self._ensure_client()
        resp = await client.delete(
            "/videos", params={"id": post_id}
        )
        return resp.status_code in (200, 204)

    async def get_post_metrics(self, post_id: str) -> PostMetrics:
        client = await self._ensure_client()
        resp = await client.get(
            "/videos",
            params={"part": "statistics", "id": post_id},
        )
        if resp.status_code != 200:
            return PostMetrics(post_id=post_id, platform=self.platform_name)

        items = resp.json().get("items", [])
        if not items:
            return PostMetrics(post_id=post_id, platform=self.platform_name)

        stats = items[0].get("statistics", {})
        return PostMetrics(
            post_id=post_id,
            platform=self.platform_name,
            video_views=int(stats.get("viewCount", 0)),
            likes=int(stats.get("likeCount", 0)),
            comments=int(stats.get("commentCount", 0)),
            collected_at=datetime.now(timezone.utc),
        )

    async def get_account_metrics(self) -> AccountMetrics:
        client = await self._ensure_client()
        resp = await client.get(
            "/channels",
            params={"part": "statistics", "id": self._channel_id},
        )
        if resp.status_code != 200:
            return AccountMetrics(platform=self.platform_name)

        items = resp.json().get("items", [])
        if not items:
            return AccountMetrics(platform=self.platform_name)

        stats = items[0].get("statistics", {})
        return AccountMetrics(
            platform=self.platform_name,
            followers=int(stats.get("subscriberCount", 0)),
            total_posts=int(stats.get("videoCount", 0)),
            collected_at=datetime.now(timezone.utc),
        )

    async def get_recent_comments(
        self, post_id: str, limit: int = 50
    ) -> list[Comment]:
        client = await self._ensure_client()
        resp = await client.get(
            "/commentThreads",
            params={
                "part": "snippet",
                "videoId": post_id,
                "maxResults": min(limit, 100),
                "order": "time",
            },
        )
        if resp.status_code != 200:
            return []

        return [
            Comment(
                comment_id=item["id"],
                post_id=post_id,
                platform=self.platform_name,
                author=item["snippet"]["topLevelComment"]["snippet"].get(
                    "authorDisplayName", ""
                ),
                text=item["snippet"]["topLevelComment"]["snippet"].get(
                    "textDisplay", ""
                ),
                created_at=datetime.fromisoformat(
                    item["snippet"]["topLevelComment"]["snippet"]["publishedAt"]
                    .replace("Z", "+00:00")
                )
                if "publishedAt" in item["snippet"]["topLevelComment"]["snippet"]
                else None,
            )
            for item in resp.json().get("items", [])
        ]

    async def reply_to_comment(
        self, post_id: str, comment_id: str, text: str
    ) -> bool:
        client = await self._ensure_client()
        resp = await client.post(
            "/comments",
            params={"part": "snippet"},
            json={
                "snippet": {
                    "parentId": comment_id,
                    "textOriginal": text,
                }
            },
        )
        return resp.status_code in (200, 201)

    async def get_trending_topics(self) -> list[dict[str, Any]]:
        client = await self._ensure_client()
        resp = await client.get(
            "/videos",
            params={
                "part": "snippet",
                "chart": "mostPopular",
                "maxResults": 20,
                "regionCode": "US",
            },
        )
        if resp.status_code != 200:
            return []

        return [
            {
                "title": item["snippet"]["title"],
                "channel": item["snippet"]["channelTitle"],
                "video_id": item["id"],
            }
            for item in resp.json().get("items", [])
        ]

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
