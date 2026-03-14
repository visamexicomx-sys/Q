"""Automated response system for social media engagement."""

from __future__ import annotations

import logging
import random
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from ..platforms.base import Comment

logger = logging.getLogger(__name__)


@dataclass
class ReplyRule:
    """A rule for auto-replying to comments."""

    trigger: str  # question, positive_sentiment, negative_sentiment, purchase_intent, mention, spam
    action: str  # ai_response, thank_and_engage, empathize_and_redirect, provide_link, acknowledge, hide_and_report
    responses: list[str] = field(default_factory=list)
    tone: str = "friendly"
    max_delay_seconds: int = 300
    escalate_to_human: bool = False
    include_cta: bool = False
    enabled: bool = True


DEFAULT_RULES: list[ReplyRule] = [
    ReplyRule(
        trigger="question",
        action="ai_response",
        tone="helpful",
        max_delay_seconds=300,
    ),
    ReplyRule(
        trigger="positive_sentiment",
        action="thank_and_engage",
        responses=[
            "Thank you so much! We really appreciate your support!",
            "Thanks for the kind words! Means a lot to us.",
            "So glad you enjoyed it! Stay tuned for more.",
            "You made our day! Thanks for sharing the love.",
        ],
        max_delay_seconds=900,
    ),
    ReplyRule(
        trigger="negative_sentiment",
        action="empathize_and_redirect",
        responses=[
            "We're sorry to hear that. We'd love to help — please DM us with details.",
            "Thanks for your feedback. We're constantly improving. Can you share more in DMs?",
            "We appreciate your honesty. Let's resolve this — please reach out via DM.",
        ],
        escalate_to_human=True,
        max_delay_seconds=300,
    ),
    ReplyRule(
        trigger="purchase_intent",
        action="provide_link",
        responses=[
            "Great question! You can find all the details here: {link}",
            "Glad you're interested! Check it out: {link}",
        ],
        include_cta=True,
        max_delay_seconds=120,
    ),
    ReplyRule(
        trigger="mention",
        action="acknowledge",
        responses=[
            "Thanks for the mention!",
            "Appreciate the shout-out!",
            "Thanks for thinking of us!",
        ],
        max_delay_seconds=600,
    ),
    ReplyRule(
        trigger="spam",
        action="hide_and_report",
        max_delay_seconds=60,
    ),
]

# Simple keyword-based sentiment/intent detection
QUESTION_PATTERNS = [
    r"\?$", r"^(how|what|when|where|why|who|can|does|is|are|will|should|could)\b",
    r"\b(help|question|wondering|curious|ask)\b",
]

POSITIVE_PATTERNS = [
    r"\b(love|great|amazing|awesome|excellent|fantastic|wonderful|perfect|best)\b",
    r"\b(thank|thanks|congrats|bravo|kudos|fire)\b",
    r"[❤️🔥💯👏🙌😍🎉]+",
]

NEGATIVE_PATTERNS = [
    r"\b(terrible|awful|worst|hate|disappointed|frustrat|broken|scam|fake)\b",
    r"\b(bad|poor|horrible|useless|waste)\b",
]

PURCHASE_PATTERNS = [
    r"\b(price|cost|buy|purchase|order|shipping|discount|coupon|deal)\b",
    r"\b(where can i get|how to buy|how much|available)\b",
]

SPAM_PATTERNS = [
    r"\b(follow me|check my|dm me for|free followers|make money fast)\b",
    r"(.)\1{5,}",  # Repeated characters
]


class AutoReplyEngine:
    """Automated reply engine for social media comments."""

    def __init__(
        self,
        rules: list[ReplyRule] | None = None,
        brand_link: str = "",
    ) -> None:
        self.rules = rules or DEFAULT_RULES
        self.brand_link = brand_link
        self._reply_history: dict[str, datetime] = {}

    def classify_comment(self, comment: Comment) -> str:
        """Classify a comment into a trigger category."""
        text = comment.text.lower()

        # Check spam first
        for pattern in SPAM_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return "spam"

        # Check purchase intent
        for pattern in PURCHASE_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return "purchase_intent"

        # Check question
        for pattern in QUESTION_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return "question"

        # Check negative sentiment
        for pattern in NEGATIVE_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return "negative_sentiment"

        # Check positive sentiment
        for pattern in POSITIVE_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return "positive_sentiment"

        return "mention"

    def generate_reply(
        self, comment: Comment, **kwargs: Any
    ) -> dict[str, Any] | None:
        """Generate a reply for a comment based on rules."""
        trigger = self.classify_comment(comment)

        # Find matching rule
        rule = None
        for r in self.rules:
            if r.trigger == trigger and r.enabled:
                rule = r
                break

        if not rule:
            return None

        # Check if we already replied
        if comment.comment_id in self._reply_history:
            return None

        result: dict[str, Any] = {
            "comment_id": comment.comment_id,
            "post_id": comment.post_id,
            "platform": comment.platform,
            "trigger": trigger,
            "action": rule.action,
            "escalate": rule.escalate_to_human,
        }

        if rule.action == "hide_and_report":
            result["reply_text"] = ""
            result["hide"] = True
        elif rule.action == "ai_response":
            result["reply_text"] = self._generate_ai_reply(comment, rule.tone)
        elif rule.responses:
            reply = random.choice(rule.responses)
            if "{link}" in reply:
                reply = reply.replace("{link}", self.brand_link or "[link in bio]")
            result["reply_text"] = reply
        else:
            result["reply_text"] = "Thanks for reaching out! We appreciate it."

        self._reply_history[comment.comment_id] = datetime.now(timezone.utc)
        return result

    def process_comments(
        self, comments: list[Comment]
    ) -> list[dict[str, Any]]:
        """Process a batch of comments and generate replies."""
        replies: list[dict[str, Any]] = []

        for comment in comments:
            reply = self.generate_reply(comment)
            if reply:
                replies.append(reply)

        return replies

    def _generate_ai_reply(self, comment: Comment, tone: str) -> str:
        """Generate an AI-powered reply to a question or complex comment."""
        # Placeholder — in production, this calls an LLM
        text = comment.text.strip()
        if "?" in text:
            return f"Great question! We'd love to help. Could you DM us with more details so we can give you the best answer?"
        return f"Thanks for your comment! We appreciate you engaging with our content."

    def get_stats(self) -> dict[str, int]:
        """Get auto-reply statistics."""
        return {
            "total_replies": len(self._reply_history),
            "rules_active": len([r for r in self.rules if r.enabled]),
        }
