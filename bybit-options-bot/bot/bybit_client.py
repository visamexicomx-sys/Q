"""Minimal Bybit V5 REST client (signed) — market data + trading.

Uses `requests` with HMAC-SHA256 signing per Bybit's V5 spec; no pybit
dependency. Public market-data calls are unsigned. Private calls require API
key/secret and are only used by the execution layer, which is itself gated
behind the live-trading flag and the risk manager.

Network errors are retried with exponential backoff. Bybit business errors
(retCode != 0) are raised immediately — retrying a rejected order is unsafe.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass

import requests

MAINNET = "https://api.bybit.com"
TESTNET = "https://api-testnet.bybit.com"
RECV_WINDOW = "5000"


class BybitError(RuntimeError):
    def __init__(self, ret_code: int, ret_msg: str, payload=None):
        super().__init__(f"Bybit retCode={ret_code}: {ret_msg}")
        self.ret_code = ret_code
        self.ret_msg = ret_msg
        self.payload = payload


@dataclass
class ClientConfig:
    api_key: str = ""
    api_secret: str = ""
    testnet: bool = True
    recv_window: str = RECV_WINDOW
    timeout: float = 10.0
    max_retries: int = 4


class BybitClient:
    def __init__(self, cfg: ClientConfig):
        self.cfg = cfg
        self.base = TESTNET if cfg.testnet else MAINNET
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "bybit-options-bot/1.0"})

    # ----- low-level request with retry/backoff -----

    def _request(self, method: str, path: str, params: dict | None, signed: bool):
        params = params or {}
        url = self.base + path
        last_exc: Exception | None = None
        for attempt in range(self.cfg.max_retries + 1):
            try:
                headers = {}
                if method == "GET":
                    query = _encode_query(params)
                    if signed:
                        headers = self._sign(query)
                    resp = self.session.get(
                        url + ("?" + query if query else ""),
                        headers=headers,
                        timeout=self.cfg.timeout,
                    )
                else:
                    body = json.dumps(params, separators=(",", ":")) if params else ""
                    if signed:
                        headers = self._sign(body)
                    headers["Content-Type"] = "application/json"
                    resp = self.session.post(
                        url, data=body, headers=headers, timeout=self.cfg.timeout
                    )
                resp.raise_for_status()
                data = resp.json()
                if data.get("retCode", 0) != 0:
                    raise BybitError(data.get("retCode"), data.get("retMsg", ""), data)
                return data.get("result", {})
            except (requests.ConnectionError, requests.Timeout) as exc:
                last_exc = exc
                if attempt < self.cfg.max_retries:
                    time.sleep(2 ** (attempt + 1))
                    continue
                raise
            except requests.HTTPError as exc:
                # 5xx may be transient; 4xx and business errors are not.
                last_exc = exc
                status = exc.response.status_code if exc.response is not None else 0
                if 500 <= status < 600 and attempt < self.cfg.max_retries:
                    time.sleep(2 ** (attempt + 1))
                    continue
                raise
        if last_exc:
            raise last_exc
        raise RuntimeError("request failed without exception")

    def _sign(self, payload: str) -> dict:
        ts = str(int(time.time() * 1000))
        to_sign = ts + self.cfg.api_key + self.cfg.recv_window + payload
        sign = hmac.new(
            self.cfg.api_secret.encode(), to_sign.encode(), hashlib.sha256
        ).hexdigest()
        return {
            "X-BAPI-API-KEY": self.cfg.api_key,
            "X-BAPI-TIMESTAMP": ts,
            "X-BAPI-RECV-WINDOW": self.cfg.recv_window,
            "X-BAPI-SIGN": sign,
            "X-BAPI-SIGN-TYPE": "2",
        }

    # ----- public market data -----

    def get_server_time(self) -> dict:
        return self._request("GET", "/v5/market/time", {}, signed=False)

    def get_instruments(self, category: str, base_coin: str | None = None,
                        symbol: str | None = None) -> list[dict]:
        params: dict = {"category": category, "limit": 1000}
        if base_coin:
            params["baseCoin"] = base_coin
        if symbol:
            params["symbol"] = symbol
        result = self._request("GET", "/v5/market/instruments-info", params, signed=False)
        return result.get("list", [])

    def get_tickers(self, category: str, base_coin: str | None = None,
                   symbol: str | None = None) -> list[dict]:
        params: dict = {"category": category}
        if base_coin:
            params["baseCoin"] = base_coin
        if symbol:
            params["symbol"] = symbol
        result = self._request("GET", "/v5/market/tickers", params, signed=False)
        return result.get("list", [])

    # ----- private (require API key) -----

    def get_wallet_balance(self, account_type: str = "UNIFIED") -> dict:
        return self._request(
            "GET", "/v5/account/wallet-balance", {"accountType": account_type}, signed=True
        )

    def get_positions(self, category: str, settle_coin: str | None = None) -> list[dict]:
        params: dict = {"category": category}
        if settle_coin:
            params["settleCoin"] = settle_coin
        result = self._request("GET", "/v5/position/list", params, signed=True)
        return result.get("list", [])

    def get_closed_pnl(
        self, category: str, start_time: int | None = None, limit: int = 100
    ) -> list[dict]:
        params: dict = {"category": category, "limit": limit}
        if start_time is not None:
            params["startTime"] = start_time
        result = self._request("GET", "/v5/position/closed-pnl", params, signed=True)
        return result.get("list", [])

    def place_order(
        self,
        category: str,
        symbol: str,
        side: str,
        order_type: str,
        qty: float,
        price: float | None = None,
        time_in_force: str = "GTC",
        reduce_only: bool = False,
        order_link_id: str | None = None,
    ) -> dict:
        params: dict = {
            "category": category,
            "symbol": symbol,
            "side": side,
            "orderType": order_type,
            "qty": _fmt_num(qty),
        }
        if price is not None and order_type == "Limit":
            params["price"] = _fmt_num(price)
        params["timeInForce"] = time_in_force
        if reduce_only:
            params["reduceOnly"] = True
        if order_link_id:
            params["orderLinkId"] = order_link_id[:36]
        return self._request("POST", "/v5/order/create", params, signed=True)


def _encode_query(params: dict) -> str:
    # Bybit signs the raw query string; keep insertion order, skip None.
    return "&".join(f"{k}={v}" for k, v in params.items() if v is not None)


def _fmt_num(x: float) -> str:
    # Avoid scientific notation / trailing-zero noise in order payloads.
    s = f"{x:.10f}".rstrip("0").rstrip(".")
    return s if s else "0"
