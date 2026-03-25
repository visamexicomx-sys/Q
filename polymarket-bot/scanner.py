"""Market scanner — discovers and filters trading opportunities."""

import logging
from dataclasses import dataclass, field

from api_client import Market, OrderBook, PolymarketClient
from config import BotConfig
from utils.helpers import format_usdc, truncate, time_until

logger = logging.getLogger(__name__)


@dataclass
class ScanResult:
    market: Market
    orderbook: OrderBook
    score: float  # composite attractiveness score
    tags: list[str] = field(default_factory=list)


class MarketScanner:
    """Scans and ranks markets by trading attractiveness."""

    def __init__(self, client: PolymarketClient, config: BotConfig):
        self.client = client
        self.config = config
        self._cache: dict[str, ScanResult] = {}

    def scan(self, limit: int = 50) -> list[ScanResult]:
        """Fetch markets and rank them by trading opportunity."""
        logger.info(f"Scanning top {limit} markets...")

        markets = self.client.get_markets(limit=limit, active=True, closed=False)
        results = []

        for market in markets:
            try:
                if not self._passes_filter(market):
                    continue

                # Fetch orderbook for YES token
                if not market.yes_token_id:
                    continue

                orderbook = self.client.get_orderbook(market.yes_token_id, market)
                score, tags = self._score_market(market, orderbook)

                result = ScanResult(
                    market=market,
                    orderbook=orderbook,
                    score=score,
                    tags=tags,
                )
                results.append(result)
                self._cache[market.condition_id] = result

            except Exception as e:
                logger.debug(f"Error scanning {market.question[:40]}: {e}")
                continue

        results.sort(key=lambda r: r.score, reverse=True)

        logger.info(
            f"Scan complete: {len(results)} tradeable markets out of {len(markets)} total"
        )

        for r in results[:10]:
            logger.debug(
                f"  [{r.score:.2f}] {truncate(r.market.question, 50)} "
                f"YES={r.market.yes_price:.3f} vol={format_usdc(r.market.volume)} "
                f"tags={r.tags}"
            )

        return results

    def _passes_filter(self, market: Market) -> bool:
        """Basic filters before deeper analysis."""
        if not market.active or market.closed:
            return False
        if market.volume < self.config.min_volume_usdc:
            return False
        if market.liquidity < self.config.min_liquidity_usdc:
            return False
        if market.yes_price <= 0.02 or market.yes_price >= 0.98:
            return False  # Too extreme, minimal upside
        return True

    def _score_market(self, market: Market, ob: OrderBook) -> tuple[float, list[str]]:
        """Score a market from 0-100 based on trading attractiveness."""
        score = 0.0
        tags = []

        # Volume score (0-25)
        if market.volume > 100_000:
            score += 25
            tags.append("high-vol")
        elif market.volume > 10_000:
            score += 15
            tags.append("med-vol")
        else:
            score += 5

        # Liquidity score (0-25)
        if market.liquidity > 50_000:
            score += 25
            tags.append("deep")
        elif market.liquidity > 5_000:
            score += 15
        else:
            score += 5

        # Spread score (0-20) — tighter is better for momentum, wider for MM
        spread = ob.spread
        if spread < 0.02:
            score += 20
            tags.append("tight")
        elif spread < 0.05:
            score += 15
        elif spread < 0.10:
            score += 10
            tags.append("wide-spread")
        else:
            score += 5
            tags.append("very-wide")

        # Price uncertainty (0-15) — markets near 50/50 are most interesting
        uncertainty = 1.0 - abs(market.yes_price - 0.5) * 2
        score += uncertainty * 15
        if uncertainty > 0.7:
            tags.append("uncertain")

        # Book depth balance (0-15)
        bid_depth = ob.bid_depth(5)
        ask_depth = ob.ask_depth(5)
        if bid_depth + ask_depth > 0:
            balance = min(bid_depth, ask_depth) / max(bid_depth, ask_depth)
            score += balance * 15
            if balance < 0.3:
                tags.append("imbalanced")

        return score, tags

    def get_cached(self, condition_id: str) -> ScanResult | None:
        return self._cache.get(condition_id)

    def print_dashboard(self, results: list[ScanResult], top_n: int = 15):
        """Print a pretty market dashboard to the console."""
        from tabulate import tabulate

        rows = []
        for r in results[:top_n]:
            rows.append([
                truncate(r.market.question, 45),
                f"{r.market.yes_price:.3f}",
                f"{r.orderbook.spread:.4f}",
                format_usdc(r.market.volume),
                format_usdc(r.market.liquidity),
                time_until(r.market.end_date),
                f"{r.score:.1f}",
                ", ".join(r.tags[:3]),
            ])

        headers = ["Market", "YES", "Spread", "Volume", "Liq", "Ends", "Score", "Tags"]
        print("\n" + tabulate(rows, headers=headers, tablefmt="simple_grid"))
