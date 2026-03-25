"""Main bot orchestrator — ties together scanner, strategies, risk, and execution.

Usage:
    python bot.py                  # Run in DRY_RUN mode (default)
    python bot.py --scan           # Just scan markets, no trading
    python bot.py --live           # Live trading (requires credentials)
    python bot.py --dashboard      # Continuous dashboard mode
"""

import argparse
import logging
import signal
import sys
import time

from api_client import PolymarketClient
from config import load_config, BotConfig, PolymarketConfig
from risk_manager import RiskManager
from scanner import MarketScanner
from strategies import (
    ValueStrategy,
    MomentumStrategy,
    MarketMakerStrategy,
    ArbitrageStrategy,
    Signal,
    Strategy,
)
from strategies.base import Side
from utils.helpers import format_usdc, format_pct, truncate
from utils.logger import setup_logging

logger = logging.getLogger(__name__)


class PolymarketBot:
    """Main trading bot orchestrator."""

    def __init__(self, poly_cfg: PolymarketConfig, bot_cfg: BotConfig):
        self.bot_cfg = bot_cfg
        self.client = PolymarketClient(poly_cfg)
        self.scanner = MarketScanner(self.client, bot_cfg)
        self.risk = RiskManager(bot_cfg)
        self.running = False

        # Initialize strategies
        self.strategies: list[Strategy] = [
            ValueStrategy(
                min_edge=bot_cfg.min_edge_threshold,
                kelly_fraction=bot_cfg.kelly_fraction,
                max_size_usdc=bot_cfg.max_position_size_usdc,
            ),
            MomentumStrategy(max_size_usdc=bot_cfg.order_size_usdc * 3),
            ArbitrageStrategy(max_size_usdc=bot_cfg.max_position_size_usdc),
            MarketMakerStrategy(max_size_usdc=bot_cfg.order_size_usdc * 2),
        ]

        logger.info(
            f"Bot initialized | dry_run={bot_cfg.dry_run} | "
            f"max_exposure={format_usdc(bot_cfg.max_total_exposure_usdc)} | "
            f"strategies={[s.name for s in self.strategies]}"
        )

    def scan_markets(self) -> list:
        """Run the market scanner and return results."""
        return self.scanner.scan(limit=50)

    def generate_signals(self, scan_results) -> list[Signal]:
        """Run all strategies against scanned markets and collect signals."""
        signals = []

        for result in scan_results:
            for strategy in self.strategies:
                try:
                    signal = strategy.analyze(result.market, result.orderbook)
                    if signal and signal.is_actionable:
                        signals.append(signal)
                except Exception as e:
                    logger.error(
                        f"Strategy {strategy.name} error on "
                        f"'{result.market.question[:40]}': {e}"
                    )

        # Sort by confidence * edge (best opportunities first)
        signals.sort(key=lambda s: s.confidence * abs(s.edge), reverse=True)

        logger.info(f"Generated {len(signals)} actionable signals")
        for s in signals[:5]:
            logger.info(
                f"  [{s.strategy_name}] {s.side.value} "
                f"{truncate(s.market.question, 40)} | "
                f"edge={s.edge:+.4f} conf={s.confidence:.2f} "
                f"size={format_usdc(s.size_usdc)}"
            )

        return signals

    def execute_signals(self, signals: list[Signal]):
        """Execute approved signals through risk management."""
        for signal in signals:
            # Risk check
            approved, reason, adjusted_size = self.risk.check_signal(signal)

            if not approved:
                logger.debug(f"Signal rejected: {reason} — {signal.market.question[:40]}")
                continue

            # Determine token
            if signal.side in (Side.BUY_YES, Side.SELL_YES):
                token_id = signal.market.yes_token_id
                order_side = "BUY" if signal.side == Side.BUY_YES else "SELL"
            else:
                token_id = signal.market.no_token_id
                order_side = "BUY" if signal.side == Side.BUY_NO else "SELL"

            if not token_id:
                logger.warning(f"No token ID for {signal.market.question[:40]}")
                continue

            price = signal.fair_value if signal.side in (Side.BUY_YES, Side.BUY_NO) else signal.fair_value
            size = adjusted_size / max(price, 0.01)

            if self.bot_cfg.dry_run:
                logger.info(
                    f"[DRY RUN] Would {order_side} {size:.2f} tokens @ {price:.4f} "
                    f"(${adjusted_size:.2f}) on '{signal.market.question[:40]}' "
                    f"via {signal.strategy_name}"
                )
                # Still track the position for paper trading
                self.risk.open_position(signal, adjusted_size, token_id)
            else:
                result = self.client.place_limit_order(
                    token_id=token_id,
                    side=order_side,
                    price=round(price, 4),
                    size=round(size, 2),
                )
                if result:
                    self.risk.open_position(signal, adjusted_size, token_id)
                else:
                    logger.error(f"Order failed for {signal.market.question[:40]}")

    def check_exits(self):
        """Check existing positions for exit conditions."""
        for market_id, position in list(self.risk.positions.items()):
            try:
                current_price = self.client.get_midpoint(position.token_id)

                for strategy in self.strategies:
                    if strategy.name != position.strategy:
                        continue

                    # Build a minimal Market for the exit check
                    cached = self.scanner.get_cached(market_id)
                    if not cached:
                        continue

                    if strategy.should_exit(
                        cached.market, position.entry_price, current_price
                    ):
                        logger.info(
                            f"Exit signal for '{cached.market.question[:40]}' "
                            f"entry={position.entry_price:.4f} current={current_price:.4f}"
                        )

                        if not self.bot_cfg.dry_run:
                            exit_side = "SELL" if "BUY" in position.side else "BUY"
                            self.client.place_market_order(
                                position.token_id,
                                exit_side,
                                position.size_usdc,
                            )

                        self.risk.close_position(market_id, current_price)
                        break
            except Exception as e:
                logger.error(f"Exit check error for {market_id}: {e}")

    def print_status(self):
        """Print current bot status."""
        summary = self.risk.get_summary()
        print("\n" + "=" * 70)
        print(f"  POLYMARKET BOT STATUS {'(DRY RUN)' if self.bot_cfg.dry_run else '(LIVE)'}")
        print("=" * 70)
        print(f"  Exposure:  {format_usdc(summary['total_exposure'])} / "
              f"{format_usdc(self.bot_cfg.max_total_exposure_usdc)}")
        print(f"  Available: {format_usdc(summary['available_capital'])}")
        print(f"  Positions: {summary['open_positions']}")
        print(f"  Daily PnL: {format_usdc(summary['daily_pnl'])}")
        print(f"  Trades:    {summary['daily_trades']} | "
              f"Volume: {format_usdc(summary['daily_volume'])}")

        if summary["positions"]:
            print("\n  Open Positions:")
            for mid, pos in summary["positions"].items():
                cached = self.scanner.get_cached(mid)
                name = truncate(cached.market.question, 35) if cached else mid[:20]
                print(
                    f"    {pos['side']:<10} {format_usdc(pos['size']):>10} "
                    f"@ {pos['entry']:.4f} ({pos['age_min']:.0f}min) "
                    f"[{pos['strategy']}] {name}"
                )
        print("=" * 70 + "\n")

    def run_once(self):
        """Execute one full trading cycle."""
        logger.info("Starting trading cycle...")

        # 1. Scan markets
        scan_results = self.scan_markets()

        # 2. Check exits on existing positions
        self.check_exits()

        # 3. Generate new signals
        signals = self.generate_signals(scan_results)

        # 4. Execute
        self.execute_signals(signals)

        # 5. Status
        self.print_status()

    def run(self):
        """Run the bot in a continuous loop."""
        self.running = True

        def handle_shutdown(signum, frame):
            logger.info("Shutdown signal received — stopping bot...")
            self.running = False

        signal.signal(signal.SIGINT, handle_shutdown)
        signal.signal(signal.SIGTERM, handle_shutdown)

        logger.info(
            f"Bot starting — scanning every {self.bot_cfg.scan_interval_seconds}s"
        )

        while self.running:
            try:
                self.run_once()
            except KeyboardInterrupt:
                break
            except Exception as e:
                logger.error(f"Cycle error: {e}", exc_info=True)

            if self.running:
                logger.info(
                    f"Sleeping {self.bot_cfg.scan_interval_seconds}s until next cycle..."
                )
                time.sleep(self.bot_cfg.scan_interval_seconds)

        # Cleanup
        if not self.bot_cfg.dry_run:
            logger.info("Cancelling all open orders...")
            self.client.cancel_all_orders()

        logger.info("Bot stopped.")


def main():
    parser = argparse.ArgumentParser(description="Polymarket Trading Bot")
    parser.add_argument("--scan", action="store_true", help="Scan markets only (no trading)")
    parser.add_argument("--live", action="store_true", help="Enable live trading")
    parser.add_argument("--dashboard", action="store_true", help="Continuous dashboard mode")
    parser.add_argument("--once", action="store_true", help="Run one cycle and exit")
    args = parser.parse_args()

    poly_cfg, bot_cfg = load_config()

    if args.live:
        bot_cfg.dry_run = False

    setup_logging(bot_cfg.log_level)

    bot = PolymarketBot(poly_cfg, bot_cfg)

    if args.scan:
        results = bot.scan_markets()
        bot.scanner.print_dashboard(results)
        return

    if args.dashboard:
        while True:
            results = bot.scan_markets()
            bot.scanner.print_dashboard(results)
            time.sleep(30)

    if args.once:
        bot.run_once()
        return

    bot.run()


if __name__ == "__main__":
    main()
