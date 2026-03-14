"""Twitter/X platform connector."""

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


class TwitterConnector(PlatformConnector):
    """Connector for Twitter/X API v2."""

    platform_name = "twitter"
    BASE_URL = "https://api.twitter.com/2"

    def __init__(self, credentials: PlatformCredentials) -> None:
        super().__init__(credentials)
        self._client: httpx.AsyncClient | None = None
        self._user_id: str = ""

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                timeout=30.0,
                headers={
                    "Authorization": f"Bearer {self.credentials.bearer_token}",
                    "Content-Type": "application/json",
                },
            )
        return self._client

    async def authenticate(self) -> bool:
        client = await self._ensure_client()
        resp = await client.get("/users/me")
        if resp.status_code == 200:
            self._user_id = resp.json()["data"]["id"]
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
        payload: dict[str, Any] = {"text": text[:280]}

        if reply_to := kwargs.get("reply_to"):
            payload["reply"] = {"in_reply_to_tweet_id": reply_to}

        if poll_options := kwargs.get("poll_options"):
            payload["poll"] = {
                "options": [{"label": o} for o in poll_options[:4]],
                "duration_minutes": kwargs.get("poll_duration", 1440),
            }

        if quote_tweet_id := kwargs.get("quote_tweet_id"):
            payload["quote_tweet_id"] = quote_tweet_id

        resp = await client.post("/tweets", json=payload)

        if resp.status_code in (200, 201):
            data = resp.json()["data"]
            return PostResult(
                success=True,
                post_id=data["id"],
                url=f"https://twitter.com/i/status/{data['id']}",
                platform=self.platform_name,
                published_at=datetime.now(timezone.utc),
            )
        return PostResult(
            success=False,
            platform=self.platform_name,
            error=f"Twitter API error: {resp.text}",
        )

    async def publish_thread(self, posts: list[str]) -> list[PostResult]:
        """Publish a Twitter thread."""
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
        resp = await client.delete(f"/tweets/{post_id}")
        return resp.status_code == 200

    async def get_post_metrics(self, post_id: str) -> PostMetrics:
        client = await self._ensure_client()
        resp = await client.get(
            f"/tweets/{post_id}",
            params={
                "tweet.fields": "public_metrics,organic_metrics",
            },
        )
        if resp.status_code != 200:
            return PostMetrics(post_id=post_id, platform=self.platform_name)

        metrics = resp.json()["data"].get("public_metrics", {})
        return PostMetrics(
            post_id=post_id,
            platform=self.platform_name,
            likes=metrics.get("like_count", 0),
            comments=metrics.get("reply_count", 0),
            shares=metrics.get("retweet_count", 0),
            impressions=metrics.get("impression_count", 0),
            clicks=metrics.get("url_link_clicks", 0),
            collected_at=datetime.now(timezone.utc),
        )

    async def get_account_metrics(self) -> AccountMetrics:
        client = await self._ensure_client()
        resp = await client.get(
            f"/users/{self._user_id}",
            params={"user.fields": "public_metrics"},
        )
        if resp.status_code != 200:
            return AccountMetrics(platform=self.platform_name)

        metrics = resp.json()["data"].get("public_metrics", {})
        return AccountMetrics(
            platform=self.platform_name,
            followers=metrics.get("followers_count", 0),
            following=metrics.get("following_count", 0),
            total_posts=metrics.get("tweet_count", 0),
            collected_at=datetime.now(timezone.utc),
        )

    async def get_recent_comments(
        self, post_id: str, limit: int = 50
    ) -> list[Comment]:
        client = await self._ensure_client()
        resp = await client.get(
            "/tweets/search/recent",
            params={
                "query": f"conversation_id:{post_id}",
                "max_results": min(limit, 100),
                "tweet.fields": "author_id,created_at,text",
            },
        )
        if resp.status_code != 200:
            return []

        return [
            Comment(
                comment_id=t["id"],
                post_id=post_id,
                platform=self.platform_name,
                author=t.get("author_id", ""),
                text=t.get("text", ""),
                created_at=datetime.fromisoformat(
                    t["created_at"].replace("Z", "+00:00")
                )
                if "created_at" in t
                else None,
            )
            for t in resp.json().get("data", [])
        ]

    async def reply_to_comment(
        self, post_id: str, comment_id: str, text: str
    ) -> bool:
        result = await self.publish_post(text, reply_to=comment_id)
        return result.success

    async def get_trending_topics(self) -> list[dict[str, Any]]:
        client = await self._ensure_client()
        resp = await client.get(
            "/trends/place", params={"id": 1}
        )
        if resp.status_code != 200:
            return []

        trends = resp.json()
        if trends and len(trends) > 0:
            return [
                {
                    "name": t["name"],
                    "volume": t.get("tweet_volume", 0),
                    "url": t.get("url", ""),
                }
                for t in trends[0].get("trends", [])[:20]
            ]
        return []

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
