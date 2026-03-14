"""Instagram platform connector via Meta Graph API."""

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


class InstagramConnector(PlatformConnector):
    """Connector for Instagram Graph API."""

    platform_name = "instagram"
    BASE_URL = "https://graph.facebook.com/v18.0"

    def __init__(self, credentials: PlatformCredentials) -> None:
        super().__init__(credentials)
        self._client: httpx.AsyncClient | None = None
        self._ig_user_id = credentials.business_account_id

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL, timeout=30.0
            )
        return self._client

    def _params(self, **extra: Any) -> dict[str, Any]:
        return {"access_token": self.credentials.access_token, **extra}

    async def authenticate(self) -> bool:
        client = await self._ensure_client()
        resp = await client.get(
            f"/{self._ig_user_id}",
            params=self._params(fields="id,username"),
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
        image_url = kwargs.get("image_url", "")

        if not image_url:
            return PostResult(
                success=False,
                platform=self.platform_name,
                error="Instagram requires an image or video URL.",
            )

        media_type = kwargs.get("media_type", "IMAGE")

        # Step 1: Create container
        container_params: dict[str, Any] = {
            "caption": text[:2200],
            "access_token": self.credentials.access_token,
        }

        if media_type == "IMAGE":
            container_params["image_url"] = image_url
        elif media_type == "VIDEO":
            container_params["media_type"] = "VIDEO"
            container_params["video_url"] = image_url
        elif media_type == "REELS":
            container_params["media_type"] = "REELS"
            container_params["video_url"] = image_url
        elif media_type == "CAROUSEL":
            children = kwargs.get("carousel_children", [])
            container_params["media_type"] = "CAROUSEL"
            container_params["children"] = ",".join(children)

        resp = await client.post(
            f"/{self._ig_user_id}/media", params=container_params
        )
        if resp.status_code != 200:
            return PostResult(
                success=False,
                platform=self.platform_name,
                error=f"Container creation failed: {resp.text}",
            )

        container_id = resp.json()["id"]

        # Step 2: Publish
        resp = await client.post(
            f"/{self._ig_user_id}/media_publish",
            params=self._params(creation_id=container_id),
        )
        if resp.status_code != 200:
            return PostResult(
                success=False,
                platform=self.platform_name,
                error=f"Publish failed: {resp.text}",
            )

        post_id = resp.json()["id"]
        return PostResult(
            success=True,
            post_id=post_id,
            url=f"https://www.instagram.com/p/{post_id}/",
            platform=self.platform_name,
            published_at=datetime.now(timezone.utc),
        )

    async def create_story(
        self, image_url: str | None = None, video_url: str | None = None
    ) -> PostResult:
        """Create an Instagram Story."""
        client = await self._ensure_client()
        params: dict[str, Any] = {
            "access_token": self.credentials.access_token,
            "media_type": "STORIES",
        }

        if image_url:
            params["image_url"] = image_url
        elif video_url:
            params["video_url"] = video_url
        else:
            return PostResult(
                success=False, platform=self.platform_name,
                error="Story requires image or video.",
            )

        resp = await client.post(f"/{self._ig_user_id}/media", params=params)
        if resp.status_code != 200:
            return PostResult(
                success=False, platform=self.platform_name, error=resp.text,
            )

        container_id = resp.json()["id"]
        resp = await client.post(
            f"/{self._ig_user_id}/media_publish",
            params=self._params(creation_id=container_id),
        )

        if resp.status_code == 200:
            return PostResult(
                success=True,
                post_id=resp.json()["id"],
                platform=self.platform_name,
                published_at=datetime.now(timezone.utc),
            )
        return PostResult(
            success=False, platform=self.platform_name, error=resp.text,
        )

    async def delete_post(self, post_id: str) -> bool:
        return False  # Instagram API doesn't support deletion

    async def get_post_metrics(self, post_id: str) -> PostMetrics:
        client = await self._ensure_client()
        resp = await client.get(
            f"/{post_id}/insights",
            params=self._params(metric="impressions,reach,saved,likes,comments,shares"),
        )
        if resp.status_code != 200:
            return PostMetrics(post_id=post_id, platform=self.platform_name)

        metrics_data = {}
        for item in resp.json().get("data", []):
            metrics_data[item["name"]] = item["values"][0]["value"]

        return PostMetrics(
            post_id=post_id,
            platform=self.platform_name,
            impressions=metrics_data.get("impressions", 0),
            reach=metrics_data.get("reach", 0),
            likes=metrics_data.get("likes", 0),
            comments=metrics_data.get("comments", 0),
            shares=metrics_data.get("shares", 0),
            saves=metrics_data.get("saved", 0),
            collected_at=datetime.now(timezone.utc),
        )

    async def get_account_metrics(self) -> AccountMetrics:
        client = await self._ensure_client()
        resp = await client.get(
            f"/{self._ig_user_id}",
            params=self._params(fields="followers_count,follows_count,media_count"),
        )
        if resp.status_code != 200:
            return AccountMetrics(platform=self.platform_name)

        data = resp.json()
        return AccountMetrics(
            platform=self.platform_name,
            followers=data.get("followers_count", 0),
            following=data.get("follows_count", 0),
            total_posts=data.get("media_count", 0),
            collected_at=datetime.now(timezone.utc),
        )

    async def get_recent_comments(
        self, post_id: str, limit: int = 50
    ) -> list[Comment]:
        client = await self._ensure_client()
        resp = await client.get(
            f"/{post_id}/comments",
            params=self._params(fields="id,text,username,timestamp", limit=limit),
        )
        if resp.status_code != 200:
            return []

        return [
            Comment(
                comment_id=c["id"],
                post_id=post_id,
                platform=self.platform_name,
                author=c.get("username", ""),
                text=c.get("text", ""),
                created_at=datetime.fromisoformat(
                    c["timestamp"].replace("+0000", "+00:00")
                )
                if "timestamp" in c
                else None,
            )
            for c in resp.json().get("data", [])
        ]

    async def reply_to_comment(
        self, post_id: str, comment_id: str, text: str
    ) -> bool:
        client = await self._ensure_client()
        resp = await client.post(
            f"/{comment_id}/replies",
            params=self._params(message=text),
        )
        return resp.status_code == 200

    async def get_trending_topics(self) -> list[dict[str, Any]]:
        return []  # Instagram API doesn't expose trending topics

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
