"""LinkedIn platform connector."""

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


class LinkedInConnector(PlatformConnector):
    """Connector for LinkedIn API v2."""

    platform_name = "linkedin"
    BASE_URL = "https://api.linkedin.com/v2"

    def __init__(self, credentials: PlatformCredentials) -> None:
        super().__init__(credentials)
        self._client: httpx.AsyncClient | None = None
        self._person_urn: str = ""

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                timeout=30.0,
                headers={
                    "Authorization": f"Bearer {self.credentials.access_token}",
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
            )
        return self._client

    async def authenticate(self) -> bool:
        client = await self._ensure_client()
        resp = await client.get("/userinfo")
        if resp.status_code == 200:
            data = resp.json()
            self._person_urn = f"urn:li:person:{data['sub']}"
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

        payload: dict[str, Any] = {
            "author": self._person_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": text[:3000]},
                    "shareMediaCategory": "NONE",
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            },
        }

        if link := kwargs.get("link"):
            content = payload["specificContent"]["com.linkedin.ugc.ShareContent"]
            content["shareMediaCategory"] = "ARTICLE"
            content["media"] = [
                {
                    "status": "READY",
                    "originalUrl": link,
                    "title": {"text": kwargs.get("link_title", "")},
                    "description": {"text": kwargs.get("link_desc", "")},
                }
            ]

        resp = await client.post("/ugcPosts", json=payload)
        if resp.status_code in (200, 201):
            post_id = resp.json().get("id", resp.headers.get("x-restli-id", ""))
            return PostResult(
                success=True,
                post_id=post_id,
                platform=self.platform_name,
                published_at=datetime.now(timezone.utc),
            )
        return PostResult(
            success=False,
            platform=self.platform_name,
            error=f"LinkedIn API error: {resp.text}",
        )

    async def publish_article(
        self, title: str, body: str, **kwargs: Any
    ) -> PostResult:
        """Publish a LinkedIn article/newsletter."""
        return await self.publish_post(
            f"{title}\n\n{body}", link=kwargs.get("link"), **kwargs
        )

    async def publish_document_post(
        self, text: str, document_url: str, title: str = ""
    ) -> PostResult:
        """Publish a document/carousel post."""
        return await self.publish_post(
            text, link=document_url, link_title=title
        )

    async def delete_post(self, post_id: str) -> bool:
        client = await self._ensure_client()
        resp = await client.delete(f"/ugcPosts/{post_id}")
        return resp.status_code in (200, 204)

    async def get_post_metrics(self, post_id: str) -> PostMetrics:
        client = await self._ensure_client()
        resp = await client.get(
            "/socialActions",
            params={"q": "entity", "entity": post_id},
        )
        if resp.status_code != 200:
            return PostMetrics(post_id=post_id, platform=self.platform_name)

        data = resp.json().get("elements", [{}])[0] if resp.json().get("elements") else {}
        return PostMetrics(
            post_id=post_id,
            platform=self.platform_name,
            likes=data.get("likesSummary", {}).get("totalLikes", 0),
            comments=data.get("commentsSummary", {}).get("totalFirstLevelComments", 0),
            shares=data.get("shareStatistics", {}).get("shareCount", 0),
            collected_at=datetime.now(timezone.utc),
        )

    async def get_account_metrics(self) -> AccountMetrics:
        client = await self._ensure_client()
        resp = await client.get(
            "/networkSizes",
            params={"edgeType": "CompanyFollowedByMember", "q": "entity"},
        )
        followers = 0
        if resp.status_code == 200:
            elements = resp.json().get("elements", [])
            if elements:
                followers = elements[0].get("followerCount", 0)

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
            f"/socialActions/{post_id}/comments",
            params={"count": limit},
        )
        if resp.status_code != 200:
            return []

        return [
            Comment(
                comment_id=c.get("$URN", ""),
                post_id=post_id,
                platform=self.platform_name,
                author=c.get("actor", ""),
                text=c.get("message", {}).get("text", ""),
                created_at=datetime.fromtimestamp(
                    c["created"]["time"] / 1000, tz=timezone.utc
                )
                if "created" in c
                else None,
            )
            for c in resp.json().get("elements", [])
        ]

    async def reply_to_comment(
        self, post_id: str, comment_id: str, text: str
    ) -> bool:
        client = await self._ensure_client()
        resp = await client.post(
            f"/socialActions/{post_id}/comments",
            json={
                "actor": self._person_urn,
                "message": {"text": text},
                "parentComment": comment_id,
            },
        )
        return resp.status_code in (200, 201)

    async def get_trending_topics(self) -> list[dict[str, Any]]:
        return []

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
