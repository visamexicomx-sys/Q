"""Core orchestrator engine for the SMM Automation Agent."""

from __future__ import annotations

import asyncio
import logging
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from .config import SMMConfig, get_platform_credentials, load_config
from .content.generator import ContentGenerator
from .content.hashtags import HashtagEngine
from .scheduler.calendar import ContentCalendar, CalendarEntry
from .scheduler.queue import PostQueue, QueueItem
from .scheduler.optimal_times import OptimalTimeCalculator
from .analytics.tracker import MetricsTracker
from .analytics.reports import ReportGenerator
from .analytics.ab_testing import ABTestManager
from .analytics.competitor import CompetitorAnalyzer
from .engagement.auto_reply import AutoReplyEngine
from .engagement.monitor import MentionMonitor
from .engagement.community import CommunityManager
from .campaigns.manager import CampaignManager
from .campaigns.budget import BudgetTracker
from .campaigns.funnel import FunnelManager
from .platforms import get_connector, PlatformConnector

logger = logging.getLogger(__name__)


class SMMAgent:
    """The main SMM Automation Agent orchestrator.

    Coordinates all subsystems: content generation, scheduling,
    publishing, analytics, engagement, and campaigns.
    """

    def __init__(self, config: SMMConfig | None = None) -> None:
        self.config = config or SMMConfig()
        self._running = False

        # Core subsystems
        self.content_generator = ContentGenerator(self.config)
        self.hashtag_engine = HashtagEngine(self.config)
        self.calendar = ContentCalendar()
        self.queue = PostQueue()
        self.time_calculator = OptimalTimeCalculator(self.config.schedule.timezone)
        self.metrics_tracker = MetricsTracker()
        self.report_generator = ReportGenerator(self.metrics_tracker)
        self.ab_test_manager = ABTestManager()
        self.competitor_analyzer = CompetitorAnalyzer()
        self.auto_reply = AutoReplyEngine(brand_link=self.config.brand.website)
        self.mention_monitor = MentionMonitor()
        self.community_manager = CommunityManager()
        self.campaign_manager = CampaignManager()
        self.budget_tracker = BudgetTracker()
        self.funnel_manager = FunnelManager()

        # Platform connectors
        self.connectors: dict[str, PlatformConnector] = {}

    async def initialize(self) -> None:
        """Initialize all platform connections."""
        logger.info("Initializing SMM Agent...")

        for platform in self.config.platforms:
            try:
                creds = get_platform_credentials(platform)
                connector = get_connector(platform, creds)
                authenticated = await connector.authenticate()
                if authenticated:
                    self.connectors[platform] = connector
                    logger.info(f"Connected to {platform}")
                else:
                    logger.warning(f"Failed to authenticate with {platform}")
            except Exception as e:
                logger.error(f"Error connecting to {platform}: {e}")

        # Set up mention monitor with connectors
        self.mention_monitor.connectors = self.connectors

        # Set up competitors
        for comp in self.config.competitors:
            self.competitor_analyzer.add_competitor(
                comp, self.config.platforms
            )

        logger.info(
            f"SMM Agent initialized with {len(self.connectors)} platforms"
        )

    async def start(self) -> None:
        """Start the fully automatic agent loop."""
        self._running = True
        logger.info("Starting SMM Agent in fully automatic mode...")

        await self.initialize()

        # Run all loops concurrently
        tasks = [
            self._content_generation_loop(),
            self._publishing_loop(),
            self._engagement_loop(),
            self._analytics_loop(),
            self._optimization_loop(),
        ]

        try:
            await asyncio.gather(*tasks)
        except asyncio.CancelledError:
            logger.info("SMM Agent stopped.")
        finally:
            await self.shutdown()

    async def stop(self) -> None:
        """Stop the agent."""
        self._running = False
        logger.info("Stopping SMM Agent...")

    async def shutdown(self) -> None:
        """Clean up resources."""
        for connector in self.connectors.values():
            if hasattr(connector, "close"):
                await connector.close()
        logger.info("SMM Agent shut down.")

    # --- Content Generation ---

    async def generate_daily_content(self) -> list[CalendarEntry]:
        """Generate content for today across all platforms."""
        entries: list[CalendarEntry] = []

        for platform in self.connectors:
            posts_per_day = self.config.schedule.posts_per_day.get(platform, 2)
            schedule = self.time_calculator.get_schedule_for_week(
                platform, posts_per_day
            )

            # Generate posts for today only
            today = datetime.now(timezone.utc).date()
            today_slots = [s for s in schedule if s.date() == today]

            for slot in today_slots:
                post = self.content_generator.generate_post(platform)
                entry = CalendarEntry(
                    platform=platform,
                    scheduled_at=slot,
                    post=post,
                    status="approved" if not self.config.approval_required else "draft",
                )
                entry_id = self.calendar.add_entry(entry)
                entries.append(entry)

                # Add to publish queue
                if entry.status == "approved":
                    self.queue.add(QueueItem(
                        platform=platform,
                        post=post,
                        scheduled_at=slot,
                    ))

        logger.info(f"Generated {len(entries)} posts for today")
        return entries

    # --- Publishing ---

    async def publish_due_posts(self) -> list[dict[str, Any]]:
        """Publish all posts that are due."""
        results: list[dict[str, Any]] = []
        due_items = self.queue.get_due_items()

        for item in due_items:
            connector = self.connectors.get(item.platform)
            if not connector or not item.post:
                continue

            try:
                result = await connector.publish_post(
                    item.post.full_text
                )

                if result.success:
                    self.queue.mark_published(item.id, result)
                    self.calendar.update_status(item.id, "published")
                    logger.info(
                        f"Published to {item.platform}: {result.post_id}"
                    )
                else:
                    self.queue.mark_failed(item.id, result.error)
                    logger.error(
                        f"Failed to publish to {item.platform}: {result.error}"
                    )

                results.append({
                    "platform": item.platform,
                    "success": result.success,
                    "post_id": result.post_id,
                    "error": result.error,
                })

            except Exception as e:
                self.queue.mark_failed(item.id, str(e))
                logger.error(f"Error publishing to {item.platform}: {e}")

        return results

    # --- Analytics ---

    async def collect_metrics(self) -> dict[str, Any]:
        """Collect metrics from all platforms."""
        all_metrics: dict[str, Any] = {}

        for platform, connector in self.connectors.items():
            try:
                account = await connector.get_account_metrics()
                all_metrics[platform] = {
                    "followers": account.followers,
                    "following": account.following,
                }
            except Exception as e:
                logger.error(f"Error collecting metrics from {platform}: {e}")

        return all_metrics

    async def generate_report(
        self, report_type: str = "weekly"
    ) -> str:
        """Generate an analytics report."""
        platforms = list(self.connectors.keys())

        if report_type == "daily":
            report = self.report_generator.generate_daily_digest(platforms)
        elif report_type == "weekly":
            report = self.report_generator.generate_weekly_report(platforms)
        elif report_type == "monthly":
            report = self.report_generator.generate_monthly_report(platforms)
        else:
            report = self.report_generator.generate_weekly_report(platforms)

        return report.to_markdown()

    # --- Engagement ---

    async def process_engagement(self) -> dict[str, Any]:
        """Process comments and mentions across all platforms."""
        stats: dict[str, Any] = {"replies_sent": 0, "alerts": 0}

        # Check for new comments on recent posts
        published = [
            item for item in self.queue.items
            if item.status == "published" and item.result
        ]

        post_ids: dict[str, list[str]] = {}
        for item in published[-50:]:  # Last 50 published posts
            if item.platform not in post_ids:
                post_ids[item.platform] = []
            if item.result:
                post_ids[item.platform].append(item.result.post_id)

        # Monitor mentions
        alerts = await self.mention_monitor.check_all_platforms(post_ids)
        stats["alerts"] = len(alerts)

        # Process comments with auto-reply
        for platform, connector in self.connectors.items():
            for post_id in post_ids.get(platform, [])[:10]:
                try:
                    comments = await connector.get_recent_comments(post_id)
                    replies = self.auto_reply.process_comments(comments)

                    for reply in replies:
                        if reply.get("reply_text") and self.config.auto_engage:
                            success = await connector.reply_to_comment(
                                reply["post_id"],
                                reply["comment_id"],
                                reply["reply_text"],
                            )
                            if success:
                                stats["replies_sent"] += 1

                        # Track community interaction
                        for comment in comments:
                            self.community_manager.track_interaction(
                                comment.author,
                                platform,
                                "comment",
                            )

                except Exception as e:
                    logger.error(
                        f"Error processing engagement for {platform}/{post_id}: {e}"
                    )

        return stats

    # --- Health Check ---

    async def health_check(self) -> dict[str, Any]:
        """Check the health of all systems."""
        health: dict[str, Any] = {
            "agent_running": self._running,
            "platforms": {},
            "queue": self.queue.get_stats(),
            "calendar": self.calendar.get_stats(),
            "community": self.community_manager.get_community_health(),
        }

        for platform, connector in self.connectors.items():
            try:
                is_healthy = await connector.health_check()
                health["platforms"][platform] = {
                    "connected": is_healthy,
                    "status": "healthy" if is_healthy else "disconnected",
                }
            except Exception:
                health["platforms"][platform] = {
                    "connected": False,
                    "status": "error",
                }

        return health

    # --- Background Loops ---

    async def _content_generation_loop(self) -> None:
        """Generate content daily."""
        while self._running:
            try:
                await self.generate_daily_content()
            except Exception as e:
                logger.error(f"Content generation error: {e}")
            await asyncio.sleep(86400)  # 24 hours

    async def _publishing_loop(self) -> None:
        """Check and publish due posts every minute."""
        while self._running:
            try:
                await self.publish_due_posts()
            except Exception as e:
                logger.error(f"Publishing error: {e}")
            await asyncio.sleep(60)

    async def _engagement_loop(self) -> None:
        """Process engagement every 15 minutes."""
        while self._running:
            try:
                await self.process_engagement()
            except Exception as e:
                logger.error(f"Engagement error: {e}")
            await asyncio.sleep(900)

    async def _analytics_loop(self) -> None:
        """Collect analytics hourly."""
        while self._running:
            try:
                await self.collect_metrics()
                # Check A/B tests
                completed = self.ab_test_manager.check_and_complete_tests()
                for test in completed:
                    logger.info(
                        f"A/B test '{test.name}' completed. Winner: {test.winner}"
                    )
            except Exception as e:
                logger.error(f"Analytics error: {e}")
            await asyncio.sleep(3600)

    async def _optimization_loop(self) -> None:
        """Run optimization weekly."""
        while self._running:
            try:
                # Check expiring campaigns
                expiring = self.campaign_manager.check_expiring_campaigns()
                for campaign in expiring:
                    logger.warning(
                        f"Campaign '{campaign.name}' expires in {campaign.days_remaining} days"
                    )
            except Exception as e:
                logger.error(f"Optimization error: {e}")
            await asyncio.sleep(604800)  # 7 days


# --- CLI Entry Point ---

def main() -> None:
    """CLI entry point for the SMM Agent."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    if len(sys.argv) < 2:
        print("Usage: python -m smm_agent.core <command>")
        print("\nCommands:")
        print("  init          Initialize the SMM agent")
        print("  start         Start the fully automatic agent")
        print("  generate      Generate content for today")
        print("  schedule      Schedule content for publishing")
        print("  analytics     View analytics dashboard")
        print("  report        Generate a report (--type daily|weekly|monthly)")
        print("  competitors   Run competitor analysis")
        print("  campaign      Manage campaigns")
        print("  ab-test       Manage A/B tests")
        print("  hashtags      Research hashtags")
        print("  health        Run health check")
        print("  stop          Stop the agent")
        sys.exit(0)

    command = sys.argv[1]
    config = load_config()
    agent = SMMAgent(config)

    if command == "init":
        print("Initializing SMM Agent...")
        print("Configuration loaded.")
        print(f"Platforms: {', '.join(config.platforms) or 'None configured'}")
        print(f"Brand: {config.brand.name or 'Not set'}")
        print("\nSetup complete! Configure your .env file with API keys.")
        print("Then run: python -m smm_agent.core start")

    elif command == "start":
        print("Starting SMM Agent in fully automatic mode...")
        asyncio.run(agent.start())

    elif command == "generate":
        print("Generating content...")
        entries = asyncio.run(agent.generate_daily_content())
        print(f"Generated {len(entries)} posts.")
        for entry in entries:
            print(f"  [{entry.platform}] {entry.post.text[:80] if entry.post else ''}...")

    elif command == "health":
        print("Running health check...")
        health = asyncio.run(agent.health_check())
        print(f"Agent running: {health['agent_running']}")
        print(f"Queue: {health['queue']}")
        print(f"Calendar: {health['calendar']}")

    elif command == "report":
        report_type = "weekly"
        if "--type" in sys.argv:
            idx = sys.argv.index("--type")
            if idx + 1 < len(sys.argv):
                report_type = sys.argv[idx + 1]
        report = asyncio.run(agent.generate_report(report_type))
        print(report)

    elif command == "hashtags":
        seeds = []
        if "--seed" in sys.argv:
            idx = sys.argv.index("--seed")
            if idx + 1 < len(sys.argv):
                seeds = sys.argv[idx + 1].split(",")
        if seeds:
            results = agent.hashtag_engine.research_hashtags(seeds, "instagram")
            for h in results[:20]:
                print(f"  #{h.tag} ({h.category}) — volume: ~{h.estimated_volume:,}")
        else:
            print("Usage: python -m smm_agent.core hashtags --seed 'keyword1,keyword2'")

    elif command == "stop":
        print("Stopping SMM Agent...")
        asyncio.run(agent.stop())

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
