"""Pinterest platform connector."""

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


class PinterestConnector(PlatformConnector):
    """Connector for Pinterest API v5."""

    platform_name = "pinterest"
    BASE_URL = "https://api.pinterest.com/v5"

    def __init__(self, credentials: PlatformCredentials) -> None:
        super().__init__(credentials)
        self._client: httpx.AsyncClient | None = None

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                timeout=30.0,
                headers={
                    "Authorization": f"Bearer {self.credentials.access_token}",
                    "Content-Type": "application/json",
                },
            )
        return self._client

    async def authenticate(self) -> bool:
        client = await self._ensure_client()
        resp = await client.get("/user_account")
        self._authenticated = resp.status_code == 200
        return self._authenticated

    async def publish_post(
        self,
        text: str,
        media_paths: list[str] | None = None,
        **kwargs: Any,
    ) -> PostResult:
        """Create a pin."""
        client = await self._ensure_client()

        payload: dict[str, Any] = {
            "title": kwargs.get("title", text[:100]),
            "description": text[:500],
            "board_id": kwargs.get("board_id", ""),
            "media_source": {
                "source_type": "image_url",
                "url": kwargs.get("image_url", ""),
            },
        }

        if link := kwargs.get("link"):
            payload["link"] = link

        if alt_text := kwargs.get("alt_text"):
            payload["alt_text"] = alt_text

        resp = await client.post("/pins", json=payload)
        if resp.status_code in (200, 201):
            data = resp.json()
            return PostResult(
                success=True,
                post_id=data.get("id", ""),
                url=f"https://www.pinterest.com/pin/{data.get('id', '')}/",
                platform=self.platform_name,
                published_at=datetime.now(timezone.utc),
            )
        return PostResult(
            success=False,
            platform=self.platform_name,
            error=f"Pinterest API error: {resp.text}",
        )

    async def create_board(self, name: str, description: str = "") -> str:
        """Create a Pinterest board. Returns board ID."""
        client = await self._ensure_client()
        resp = await client.post(
            "/boards",
            json={"name": name, "description": description},
        )
        if resp.status_code in (200, 201):
            return resp.json().get("id", "")
        return ""

    async def delete_post(self, post_id: str) -> bool:
        client = await self._ensure_client()
        resp = await client.delete(f"/pins/{post_id}")
        return resp.status_code in (200, 204)

    async def get_post_metrics(self, post_id: str) -> PostMetrics:
        client = await self._ensure_client()
        resp = await client.get(
            f"/pins/{post_id}/analytics",
            params={"metric_types": "IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK"},
        )
        if resp.status_code != 200:
            return PostMetrics(post_id=post_id, platform=self.platform_name)

        data = resp.json().get("all", {}).get("lifetime_metrics", {})
        return PostMetrics(
            post_id=post_id,
            platform=self.platform_name,
            impressions=data.get("IMPRESSION", 0),
            saves=data.get("SAVE", 0),
            clicks=data.get("PIN_CLICK", 0) + data.get("OUTBOUND_CLICK", 0),
            collected_at=datetime.now(timezone.utc),
        )

    async def get_account_metrics(self) -> AccountMetrics:
        client = await self._ensure_client()
        resp = await client.get("/user_account")
        if resp.status_code != 200:
            return AccountMetrics(platform=self.platform_name)

        data = resp.json()
        return AccountMetrics(
            platform=self.platform_name,
            followers=data.get("follower_count", 0),
            following=data.get("following_count", 0),
            total_posts=data.get("pin_count", 0),
            collected_at=datetime.now(timezone.utc),
        )

    async def get_recent_comments(
        self, post_id: str, limit: int = 50
    ) -> list[Comment]:
        return []  # Pinterest API has limited comment access

    async def reply_to_comment(
        self, post_id: str, comment_id: str, text: str
    ) -> bool:
        return False

    async def get_trending_topics(self) -> list[dict[str, Any]]:
        client = await self._ensure_client()
        resp = await client.get("/trends/trending")
        if resp.status_code != 200:
            return []
        return [
            {"name": t.get("keyword", ""), "volume": t.get("volume", 0)}
            for t in resp.json().get("trends", [])
        ]

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
