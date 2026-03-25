"""Bot configuration loaded from environment variables."""

import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


@dataclass
class PolymarketConfig:
    api_key: str = field(default_factory=lambda: os.getenv("POLYMARKET_API_KEY", ""))
    secret: str = field(default_factory=lambda: os.getenv("POLYMARKET_SECRET", ""))
    passphrase: str = field(default_factory=lambda: os.getenv("POLYMARKET_PASSPHRASE", ""))
    private_key: str = field(default_factory=lambda: os.getenv("PRIVATE_KEY", ""))
    chain_id: int = field(default_factory=lambda: int(os.getenv("CHAIN_ID", "137")))
    rpc_url: str = field(default_factory=lambda: os.getenv("RPC_URL", "https://polygon-rpc.com"))


@dataclass
class BotConfig:
    max_position_size_usdc: float = field(
        default_factory=lambda: float(os.getenv("MAX_POSITION_SIZE_USDC", "100"))
    )
    max_total_exposure_usdc: float = field(
        default_factory=lambda: float(os.getenv("MAX_TOTAL_EXPOSURE_USDC", "500"))
    )
    min_edge_threshold: float = field(
        default_factory=lambda: float(os.getenv("MIN_EDGE_THRESHOLD", "0.05"))
    )
    order_size_usdc: float = field(
        default_factory=lambda: float(os.getenv("ORDER_SIZE_USDC", "10"))
    )
    dry_run: bool = field(
        default_factory=lambda: os.getenv("DRY_RUN", "true").lower() == "true"
    )
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))

    # Timing
    scan_interval_seconds: int = 60
    order_refresh_seconds: int = 30

    # Strategy defaults
    kelly_fraction: float = 0.25  # quarter-Kelly for safety
    max_slippage: float = 0.02
    min_liquidity_usdc: float = 500.0
    min_volume_usdc: float = 1000.0


def load_config() -> tuple[PolymarketConfig, BotConfig]:
    poly_cfg = PolymarketConfig()
    bot_cfg = BotConfig()

    if not poly_cfg.private_key and not bot_cfg.dry_run:
        raise ValueError("PRIVATE_KEY required when DRY_RUN=false")

    return poly_cfg, bot_cfg
