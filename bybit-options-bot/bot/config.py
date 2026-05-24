"""Configuration loading: config.yaml for strategy/risk params, environment for
secrets and the live-trading gate.

Secrets (API key/secret, Telegram token) come ONLY from the environment, never
from the YAML file, so credentials never get committed. Live trading is off
unless BYBIT_LIVE=true is set explicitly.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

import yaml

from .bybit_client import ClientConfig
from .risk import RiskConfig
from .scanner import ScanConfig
from .strategy import StrategyConfig


def _env_bool(name: str, default: bool = False) -> bool:
    val = os.environ.get(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


@dataclass
class RuntimeConfig:
    underlyings: list[str] = field(default_factory=lambda: ["BTC", "ETH", "SOL"])
    perp_map: dict[str, str] = field(
        default_factory=lambda: {"BTC": "BTCUSDT", "ETH": "ETHUSDT", "SOL": "SOLUSDT"}
    )
    perp_category: str = "linear"
    poll_interval_sec: float = 30.0
    max_signals_per_cycle: int = 5  # most-confident signals to act on per loop
    heartbeat_minutes: float = 60.0  # periodic "still alive" status to channel (0 = off)
    log_file: str = "logs/signals.jsonl"
    state_file: str = "state/bot_state.json"


@dataclass
class TelegramConfig:
    enabled: bool = False
    bot_token: str = ""
    chat_id: str = ""


@dataclass
class Config:
    live: bool
    dry_run: bool
    client: ClientConfig
    scan: ScanConfig
    strategy: StrategyConfig
    risk: RiskConfig
    runtime: RuntimeConfig
    telegram: TelegramConfig


def _section(data: dict, name: str) -> dict:
    section = data.get(name)
    return section if isinstance(section, dict) else {}


def _apply(dc, values: dict):
    """Set only the keys that exist on the dataclass, ignoring extras."""
    valid = dc.__dataclass_fields__
    for key, val in values.items():
        if key in valid and val is not None:
            setattr(dc, key, val)
    return dc


def load_config(path: str = "config.yaml") -> Config:
    data: dict = {}
    if os.path.exists(path):
        with open(path, "r") as fh:
            data = yaml.safe_load(fh) or {}

    live = _env_bool("BYBIT_LIVE", False)
    # Testnet unless explicitly told to use mainnet AND live.
    testnet = not _env_bool("BYBIT_MAINNET", False)

    client = ClientConfig(
        api_key=os.environ.get("BYBIT_API_KEY", ""),
        api_secret=os.environ.get("BYBIT_API_SECRET", ""),
        testnet=testnet,
    )
    _apply(client, {k: v for k, v in _section(data, "client").items()
                    if k in ("timeout", "max_retries", "recv_window")})

    scan = _apply(ScanConfig(), _section(data, "scan"))
    strategy = _apply(StrategyConfig(), _section(data, "strategy"))
    risk = _apply(RiskConfig(), _section(data, "risk"))
    runtime = _apply(RuntimeConfig(), _section(data, "runtime"))

    tg_section = _section(data, "telegram")
    telegram = TelegramConfig(
        enabled=_env_bool("TELEGRAM_ENABLED", bool(tg_section.get("enabled", False))),
        bot_token=os.environ.get("TELEGRAM_BOT_TOKEN", ""),
        chat_id=os.environ.get("TELEGRAM_CHAT_ID", str(tg_section.get("chat_id", ""))),
    )

    # Live requires real credentials; otherwise force dry-run regardless of flag.
    dry_run = not live or not (client.api_key and client.api_secret)
    return Config(
        live=live,
        dry_run=dry_run,
        client=client,
        scan=scan,
        strategy=strategy,
        risk=risk,
        runtime=runtime,
        telegram=telegram,
    )
