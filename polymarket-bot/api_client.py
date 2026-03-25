"""Polymarket CLOB API client wrapper with retry logic and rate limiting."""

import logging
import time
from dataclasses import dataclass
from typing import Any

import requests

from config import PolymarketConfig

logger = logging.getLogger(__name__)

CLOB_BASE_URL = "https://clob.polymarket.com"
GAMMA_BASE_URL = "https://gamma-api.polymarket.com"


@dataclass
class Market:
    condition_id: str
    question: str
    tokens: list[dict]
    active: bool
    closed: bool
    volume: float
    liquidity: float
    end_date: str
    description: str
    outcomes: list[str]
    outcome_prices: list[float]

    @property
    def yes_price(self) -> float:
        return self.outcome_prices[0] if self.outcome_prices else 0.0

    @property
    def no_price(self) -> float:
        return self.outcome_prices[1] if len(self.outcome_prices) > 1 else 1.0 - self.yes_price

    @property
    def yes_token_id(self) -> str:
        return self.tokens[0]["token_id"] if self.tokens else ""

    @property
    def no_token_id(self) -> str:
        return self.tokens[1]["token_id"] if len(self.tokens) > 1 else ""


@dataclass
class OrderBook:
    bids: list[dict]  # [{price, size}]
    asks: list[dict]  # [{price, size}]
    market: Market
    timestamp: float

    @property
    def best_bid(self) -> float:
        return float(self.bids[0]["price"]) if self.bids else 0.0

    @property
    def best_ask(self) -> float:
        return float(self.asks[0]["price"]) if self.asks else 1.0

    @property
    def spread(self) -> float:
        return self.best_ask - self.best_bid

    @property
    def mid_price(self) -> float:
        return (self.best_bid + self.best_ask) / 2

    def bid_depth(self, levels: int = 5) -> float:
        return sum(float(b["size"]) for b in self.bids[:levels])

    def ask_depth(self, levels: int = 5) -> float:
        return sum(float(a["size"]) for a in self.asks[:levels])


class PolymarketClient:
    """Wrapper around Polymarket's CLOB and Gamma APIs."""

    def __init__(self, config: PolymarketConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self._last_request_time = 0.0
        self._min_request_interval = 0.2  # 5 req/sec rate limit

        # If API credentials provided, set up authenticated session
        if config.api_key:
            self.session.headers.update({
                "POLY-API-KEY": config.api_key,
                "POLY-SECRET": config.secret,
                "POLY-PASSPHRASE": config.passphrase,
            })

        # Optional: initialize py-clob-client for order signing
        self._clob_client = None
        self._init_clob_client()

    def _init_clob_client(self):
        """Initialize the official py-clob-client if credentials are available."""
        if not self.config.private_key:
            logger.info("No private key — running in read-only mode")
            return

        try:
            from py_clob_client.client import ClobClient

            self._clob_client = ClobClient(
                CLOB_BASE_URL,
                key=self.config.private_key,
                chain_id=self.config.chain_id,
            )

            # Derive API creds if not provided
            if not self.config.api_key:
                creds = self._clob_client.create_or_derive_api_creds()
                self._clob_client.set_api_creds(creds)
                logger.info("Derived API credentials from private key")
            else:
                from py_clob_client.clob_types import ApiCreds

                self._clob_client.set_api_creds(ApiCreds(
                    api_key=self.config.api_key,
                    api_secret=self.config.secret,
                    api_passphrase=self.config.passphrase,
                ))

            logger.info("CLOB client initialized for trading")
        except ImportError:
            logger.warning("py-clob-client not installed — order placement disabled")
        except Exception as e:
            logger.error(f"Failed to initialize CLOB client: {e}")

    def _rate_limit(self):
        elapsed = time.time() - self._last_request_time
        if elapsed < self._min_request_interval:
            time.sleep(self._min_request_interval - elapsed)
        self._last_request_time = time.time()

    def _get(self, url: str, params: dict | None = None, retries: int = 3) -> Any:
        for attempt in range(retries):
            try:
                self._rate_limit()
                resp = self.session.get(url, params=params, timeout=15)
                resp.raise_for_status()
                return resp.json()
            except requests.exceptions.RequestException as e:
                if attempt == retries - 1:
                    logger.error(f"GET {url} failed after {retries} attempts: {e}")
                    raise
                wait = 2 ** attempt
                logger.warning(f"GET {url} attempt {attempt + 1} failed, retrying in {wait}s")
                time.sleep(wait)

    # ── Market Data ──────────────────────────────────────────────────

    def get_markets(
        self,
        limit: int = 100,
        offset: int = 0,
        active: bool = True,
        closed: bool = False,
    ) -> list[Market]:
        """Fetch markets from the Gamma API."""
        params = {
            "limit": limit,
            "offset": offset,
            "active": str(active).lower(),
            "closed": str(closed).lower(),
            "order": "volume",
            "ascending": "false",
        }
        data = self._get(f"{GAMMA_BASE_URL}/markets", params=params)

        markets = []
        for m in data:
            try:
                tokens = m.get("clobTokenIds", [])
                if isinstance(tokens, str):
                    tokens = [{"token_id": t} for t in tokens.split(",")]
                elif isinstance(tokens, list) and tokens and isinstance(tokens[0], str):
                    tokens = [{"token_id": t} for t in tokens]

                prices_raw = m.get("outcomePrices", [])
                if isinstance(prices_raw, str):
                    prices = [float(p) for p in prices_raw.strip("[]").split(",") if p.strip()]
                elif isinstance(prices_raw, list):
                    prices = [float(p) for p in prices_raw]
                else:
                    prices = []

                markets.append(Market(
                    condition_id=m.get("conditionId", m.get("condition_id", "")),
                    question=m.get("question", ""),
                    tokens=tokens,
                    active=m.get("active", True),
                    closed=m.get("closed", False),
                    volume=float(m.get("volume", 0) or 0),
                    liquidity=float(m.get("liquidity", 0) or 0),
                    end_date=m.get("endDate", m.get("end_date_iso", "")),
                    description=m.get("description", ""),
                    outcomes=m.get("outcomes", ["Yes", "No"]),
                    outcome_prices=prices,
                ))
            except (ValueError, KeyError, TypeError) as e:
                logger.debug(f"Skipping malformed market: {e}")
                continue

        return markets

    def get_market(self, condition_id: str) -> Market | None:
        """Fetch a single market by condition ID."""
        try:
            data = self._get(f"{GAMMA_BASE_URL}/markets/{condition_id}")
            if not data:
                return None
            return self.get_markets(limit=1).__class__  # reuse parsing
        except Exception:
            # Fallback: search in bulk
            markets = self.get_markets(limit=200)
            for m in markets:
                if m.condition_id == condition_id:
                    return m
            return None

    def get_orderbook(self, token_id: str, market: Market | None = None) -> OrderBook:
        """Fetch the order book for a token."""
        data = self._get(f"{CLOB_BASE_URL}/book", params={"token_id": token_id})

        bids = sorted(
            [{"price": b.get("price", 0), "size": b.get("size", 0)} for b in data.get("bids", [])],
            key=lambda x: float(x["price"]),
            reverse=True,
        )
        asks = sorted(
            [{"price": a.get("price", 0), "size": a.get("size", 0)} for a in data.get("asks", [])],
            key=lambda x: float(x["price"]),
        )

        return OrderBook(bids=bids, asks=asks, market=market, timestamp=time.time())

    def get_midpoint(self, token_id: str) -> float:
        """Get the midpoint price for a token."""
        try:
            data = self._get(f"{CLOB_BASE_URL}/midpoint", params={"token_id": token_id})
            return float(data.get("mid", 0.5))
        except Exception:
            book = self.get_orderbook(token_id)
            return book.mid_price

    def get_price(self, token_id: str, side: str = "buy") -> float:
        """Get the best price for a token on a given side."""
        try:
            data = self._get(
                f"{CLOB_BASE_URL}/price",
                params={"token_id": token_id, "side": side},
            )
            return float(data.get("price", 0.5))
        except Exception:
            book = self.get_orderbook(token_id)
            return book.best_ask if side == "buy" else book.best_bid

    # ── Trading ──────────────────────────────────────────────────────

    def place_limit_order(
        self,
        token_id: str,
        side: str,  # "BUY" or "SELL"
        price: float,
        size: float,
        time_in_force: str = "GTC",
    ) -> dict | None:
        """Place a limit order via the CLOB client."""
        if not self._clob_client:
            logger.error("CLOB client not initialized — cannot place orders")
            return None

        try:
            from py_clob_client.order_builder.constants import BUY, SELL

            order_side = BUY if side.upper() == "BUY" else SELL

            order_args = {
                "token_id": token_id,
                "price": price,
                "size": size,
                "side": order_side,
            }

            signed_order = self._clob_client.create_order(order_args)
            result = self._clob_client.post_order(signed_order, time_in_force)

            logger.info(
                f"Order placed: {side} {size} @ {price} | token={token_id[:16]}... | "
                f"result={result}"
            )
            return result
        except Exception as e:
            logger.error(f"Order placement failed: {e}")
            return None

    def place_market_order(
        self,
        token_id: str,
        side: str,
        amount_usdc: float,
    ) -> dict | None:
        """Place a market order (aggressive limit at best price)."""
        book = self.get_orderbook(token_id)
        if side.upper() == "BUY":
            price = min(book.best_ask + 0.01, 0.99)
            size = amount_usdc / price
        else:
            price = max(book.best_bid - 0.01, 0.01)
            size = amount_usdc / price

        return self.place_limit_order(token_id, side, price, size, time_in_force="FOK")

    def cancel_order(self, order_id: str) -> bool:
        """Cancel an open order."""
        if not self._clob_client:
            return False
        try:
            self._clob_client.cancel(order_id)
            logger.info(f"Cancelled order {order_id}")
            return True
        except Exception as e:
            logger.error(f"Cancel failed for {order_id}: {e}")
            return False

    def cancel_all_orders(self) -> bool:
        """Cancel all open orders."""
        if not self._clob_client:
            return False
        try:
            self._clob_client.cancel_all()
            logger.info("Cancelled all orders")
            return True
        except Exception as e:
            logger.error(f"Cancel all failed: {e}")
            return False

    def get_open_orders(self) -> list[dict]:
        """Get all open orders."""
        if not self._clob_client:
            return []
        try:
            return self._clob_client.get_orders()
        except Exception as e:
            logger.error(f"Failed to fetch open orders: {e}")
            return []

    def get_positions(self) -> list[dict]:
        """Get current positions (balances)."""
        if not self._clob_client:
            return []
        try:
            return self._clob_client.get_balances()
        except Exception as e:
            logger.error(f"Failed to fetch positions: {e}")
            return []
