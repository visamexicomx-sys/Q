"""Facebook Pages platform connector."""

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


class FacebookConnector(PlatformConnector):
    """Connector for Facebook Pages Graph API."""

    platform_name = "facebook"
    BASE_URL = "https://graph.facebook.com/v18.0"

    def __init__(self, credentials: PlatformCredentials) -> None:
        super().__init__(credentials)
        self._client: httpx.AsyncClient | None = None
        self._page_id = credentials.page_id
        self._page_token = credentials.access_token

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL, timeout=30.0
            )
        return self._client

    def _params(self, **extra: Any) -> dict[str, Any]:
        return {"access_token": self._page_token, **extra}

    async def authenticate(self) -> bool:
        client = await self._ensure_client()
        resp = await client.get(
            f"/{self._page_id}",
            params=self._params(fields="id,name"),
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

        params = self._params(message=text)

        if link := kwargs.get("link"):
            params["link"] = link

        if image_url := kwargs.get("image_url"):
            resp = await client.post(
                f"/{self._page_id}/photos",
                params=self._params(url=image_url, caption=text),
            )
        else:
            resp = await client.post(
                f"/{self._page_id}/feed", params=params
            )

        if resp.status_code == 200:
            post_id = resp.json()["id"]
            return PostResult(
                success=True,
                post_id=post_id,
                url=f"https://www.facebook.com/{post_id}",
                platform=self.platform_name,
                published_at=datetime.now(timezone.utc),
            )
        return PostResult(
            success=False,
            platform=self.platform_name,
            error=f"Facebook API error: {resp.text}",
        )

    async def schedule_post(
        self,
        text: str,
        publish_at: datetime,
        media_paths: list[str] | None = None,
        **kwargs: Any,
    ) -> PostResult:
        """Facebook supports native scheduled posts."""
        client = await self._ensure_client()
        params = self._params(
            message=text,
            published=False,
            scheduled_publish_time=int(publish_at.timestamp()),
        )

        resp = await client.post(f"/{self._page_id}/feed", params=params)
        if resp.status_code == 200:
            return PostResult(
                success=True,
                post_id=resp.json()["id"],
                platform=self.platform_name,
            )
        return PostResult(
            success=False,
            platform=self.platform_name,
            error=resp.text,
        )

    async def delete_post(self, post_id: str) -> bool:
        client = await self._ensure_client()
        resp = await client.delete(
            f"/{post_id}", params=self._params()
        )
        return resp.status_code == 200

    async def get_post_metrics(self, post_id: str) -> PostMetrics:
        client = await self._ensure_client()
        resp = await client.get(
            f"/{post_id}/insights",
            params=self._params(
                metric="post_impressions,post_engaged_users,post_clicks,"
                "post_reactions_like_total"
            ),
        )

        if resp.status_code != 200:
            return PostMetrics(post_id=post_id, platform=self.platform_name)

        metrics_data = {}
        for item in resp.json().get("data", []):
            metrics_data[item["name"]] = item["values"][0]["value"]

        return PostMetrics(
            post_id=post_id,
            platform=self.platform_name,
            impressions=metrics_data.get("post_impressions", 0),
            likes=metrics_data.get("post_reactions_like_total", 0),
            clicks=metrics_data.get("post_clicks", 0),
            collected_at=datetime.now(timezone.utc),
        )

    async def get_account_metrics(self) -> AccountMetrics:
        client = await self._ensure_client()
        resp = await client.get(
            f"/{self._page_id}",
            params=self._params(fields="fan_count,talking_about_count"),
        )
        if resp.status_code != 200:
            return AccountMetrics(platform=self.platform_name)

        data = resp.json()
        return AccountMetrics(
            platform=self.platform_name,
            followers=data.get("fan_count", 0),
            collected_at=datetime.now(timezone.utc),
        )

    async def get_recent_comments(
        self, post_id: str, limit: int = 50
    ) -> list[Comment]:
        client = await self._ensure_client()
        resp = await client.get(
            f"/{post_id}/comments",
            params=self._params(
                fields="id,message,from,created_time",
                limit=limit,
            ),
        )
        if resp.status_code != 200:
            return []

        return [
            Comment(
                comment_id=c["id"],
                post_id=post_id,
                platform=self.platform_name,
                author=c.get("from", {}).get("name", ""),
                text=c.get("message", ""),
                created_at=datetime.fromisoformat(
                    c["created_time"].replace("+0000", "+00:00")
                )
                if "created_time" in c
                else None,
            )
            for c in resp.json().get("data", [])
        ]

    async def reply_to_comment(
        self, post_id: str, comment_id: str, text: str
    ) -> bool:
        client = await self._ensure_client()
        resp = await client.post(
            f"/{comment_id}/comments",
            params=self._params(message=text),
        )
        return resp.status_code == 200

    async def get_trending_topics(self) -> list[dict[str, Any]]:
        return []

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
