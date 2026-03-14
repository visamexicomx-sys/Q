"""Threads platform connector."""

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


class ThreadsConnector(PlatformConnector):
    """Connector for Threads API (Meta)."""

    platform_name = "threads"
    BASE_URL = "https://graph.threads.net/v1.0"

    def __init__(self, credentials: PlatformCredentials) -> None:
        super().__init__(credentials)
        self._client: httpx.AsyncClient | None = None
        self._user_id: str = ""

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
        resp = await client.get("/me", params=self._params(fields="id,username"))
        if resp.status_code == 200:
            self._user_id = resp.json()["id"]
            self._authenticated = True
            return True
        return False

    async def publish_post(
        self,
        text: str,
        media_paths: list[str] | None = None,
        **kwargs: Any,
    ) -> PostResult:
        client = await self._ensure_client()

        # Create media container
        container_params = self._params(
            media_type="TEXT",
            text=text[:500],
        )

        if image_url := kwargs.get("image_url"):
            container_params["media_type"] = "IMAGE"
            container_params["image_url"] = image_url

        if reply_to := kwargs.get("reply_to"):
            container_params["reply_to_id"] = reply_to

        resp = await client.post(
            f"/{self._user_id}/threads",
            params=container_params,
        )
        if resp.status_code != 200:
            return PostResult(
                success=False,
                platform=self.platform_name,
                error=f"Container creation failed: {resp.text}",
            )

        container_id = resp.json()["id"]

        # Publish
        resp = await client.post(
            f"/{self._user_id}/threads_publish",
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
            platform=self.platform_name,
            published_at=datetime.now(timezone.utc),
        )

    async def publish_thread(self, posts: list[str]) -> list[PostResult]:
        """Publish a thread of connected posts."""
        results: list[PostResult] = []
        reply_to: str | None = None

        for text in posts:
            kwargs: dict[str, Any] = {}
            if reply_to:
                kwargs["reply_to"] = reply_to

            result = await self.publish_post(text, **kwargs)
            results.append(result)

            if result.success:
                reply_to = result.post_id
            else:
                break

        return results

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
            params=self._params(metric="views,likes,replies,reposts,quotes"),
        )
        if resp.status_code != 200:
            return PostMetrics(post_id=post_id, platform=self.platform_name)

        metrics_data = {}
        for item in resp.json().get("data", []):
            metrics_data[item["name"]] = item["values"][0]["value"]

        return PostMetrics(
            post_id=post_id,
            platform=self.platform_name,
            impressions=metrics_data.get("views", 0),
            likes=metrics_data.get("likes", 0),
            comments=metrics_data.get("replies", 0),
            shares=metrics_data.get("reposts", 0) + metrics_data.get("quotes", 0),
            collected_at=datetime.now(timezone.utc),
        )

    async def get_account_metrics(self) -> AccountMetrics:
        client = await self._ensure_client()
        resp = await client.get(
            f"/{self._user_id}/threads_insights",
            params=self._params(metric="followers_count"),
        )
        followers = 0
        if resp.status_code == 200:
            data = resp.json().get("data", [])
            if data:
                followers = data[0].get("values", [{}])[0].get("value", 0)

        return AccountMetrics(
            platform=self.platform_name,
            followers=followers,
            collected_at=datetime.now(timezone.utc),
        )

    async def get_recent_comments(
        self, post_id: str, limit: int = 50
    ) -> list[Comment]:
        client = await self._ensure_client()
        resp = await client.get(
            f"/{post_id}/replies",
            params=self._params(fields="id,text,username,timestamp"),
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
                    c["timestamp"].replace("Z", "+00:00")
                )
                if "timestamp" in c
                else None,
            )
            for c in resp.json().get("data", [])
        ]

    async def reply_to_comment(
        self, post_id: str, comment_id: str, text: str
    ) -> bool:
        result = await self.publish_post(text, reply_to=comment_id)
        return result.success

    async def get_trending_topics(self) -> list[dict[str, Any]]:
        return []

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
