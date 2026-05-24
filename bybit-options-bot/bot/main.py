"""Bot orchestration loop.

Each cycle: pull the option chain for every underlying, scan for anomalously
cheap options, alert on them, then (for the most confident signals) build a
delta-neutral trade plan, run it past the risk gate, and either log it
(dry-run) or send it to the exchange (live).
"""

from __future__ import annotations

import argparse
import time

from .bybit_client import BybitClient
from .config import Config, load_config
from .execution import Executor
from .market import fetch_option_chain, fetch_perp_spec
from .notify import Notifier
from .pnl import build_report, format_report
from .risk import RiskManager
from .scanner import Signal, scan_underlying
from .state import load_state, save_state
from .strategy import InstrumentSpec, build_trade_plan


def _signal_key(sig: Signal) -> str:
    # Bucket the ask so a materially-changed quote re-alerts.
    return f"{sig.symbol}:{round(sig.ask, 4)}"


class Bot:
    def __init__(self, cfg: Config, demo: bool = False):
        self.cfg = cfg
        self.demo = demo
        self.client = BybitClient(cfg.client)
        self.notifier = Notifier(cfg.runtime.log_file, cfg.telegram)
        state, seen = load_state(cfg.runtime.state_file)
        self.risk = RiskManager(cfg.risk, state)
        self.seen = seen
        self.executor = Executor(
            self.client, self.notifier, cfg.live, cfg.dry_run, cfg.runtime.perp_category
        )
        self._perp_specs: dict[str, InstrumentSpec | None] = {}

    def _fetch_chain(self, base: str):
        if self.demo:
            from .demo import demo_chain

            return demo_chain(base)
        return fetch_option_chain(self.client, base)

    def _perp_spec(self, base_coin: str) -> InstrumentSpec | None:
        if base_coin in self._perp_specs:
            return self._perp_specs[base_coin]
        if self.demo:
            from .demo import demo_perp_spec

            spec = demo_perp_spec(base_coin)
            self._perp_specs[base_coin] = spec
            return spec
        symbol = self.cfg.runtime.perp_map.get(base_coin)
        spec = None
        if symbol:
            try:
                spec = fetch_perp_spec(self.client, symbol)
            except Exception as exc:
                self.notifier.console(f"perp spec fetch failed for {symbol}: {exc}")
        self._perp_specs[base_coin] = spec
        return spec

    def _pnl_categories(self) -> list[str]:
        cats = ["option", self.cfg.runtime.perp_category]
        seen, out = set(), []
        for c in cats:
            if c not in seen:
                seen.add(c)
                out.append(c)
        return out

    def reconcile_pnl(self) -> None:
        """Ground the daily-loss counter in Bybit's actual booked P&L."""
        if self.demo or not (self.cfg.client.api_key and self.cfg.client.api_secret):
            return
        try:
            report = build_report(self.client, self._pnl_categories())
        except Exception as exc:
            self.notifier.console(f"pnl reconcile failed: {exc}")
            return
        self.risk.state.realized_pnl_today = report.realized_today

    def run_cycle(self, allow_execute: bool = True) -> int:
        self.reconcile_pnl()
        now_ms = int(time.time() * 1000)
        all_signals: list[tuple[Signal, dict]] = []  # (signal, specs-by-symbol)

        for base in self.cfg.runtime.underlyings:
            try:
                quotes, specs = self._fetch_chain(base)
            except Exception as exc:
                self.notifier.console(f"chain fetch failed for {base}: {exc}")
                continue
            signals = scan_underlying(quotes, now_ms, self.cfg.scan)
            for s in signals:
                all_signals.append((s, specs))

        all_signals.sort(key=lambda pair: pair[0].score, reverse=True)

        # Alert on every fresh signal.
        fresh = 0
        for sig, _ in all_signals:
            key = _signal_key(sig)
            if key in self.seen:
                continue
            self.seen.add(key)
            self.notifier.emit_signal(sig)
            fresh += 1

        if allow_execute and not self.risk.halted():
            self._act_on(all_signals)
        elif self.risk.halted():
            self.notifier.console("TRADING HALTED (kill-switch or daily-loss limit) — scan only")

        save_state(self.cfg.runtime.state_file, self.risk.state, self.seen)
        return fresh

    def _act_on(self, all_signals: list[tuple[Signal, dict]]) -> None:
        acted = 0
        for sig, specs in all_signals:
            if acted >= self.cfg.runtime.max_signals_per_cycle:
                break
            if not sig.tradeable:
                continue  # multi-leg structural arbs are alert-only
            option_spec = specs.get(sig.symbol)
            if option_spec is None:
                continue
            plan = build_trade_plan(
                sig, option_spec, self.cfg.strategy, self._perp_spec(sig.base_coin)
            )
            decision = self.risk.check(plan)
            if not decision.allowed:
                self.notifier.log_event(
                    {"type": "rejected", "reason": decision.reason, "symbol": sig.symbol}
                )
                continue
            self.executor.execute(plan)
            # Count the position against the budget in both live and dry-run so
            # the paper sim throttles exactly like live would.
            self.risk.register_fill(plan)
            acted += 1

    def loop(self) -> None:
        self._banner()
        while True:
            try:
                self.run_cycle()
            except KeyboardInterrupt:
                self.notifier.console("interrupted — exiting")
                break
            except Exception as exc:
                self.notifier.console(f"cycle error: {exc}")
            time.sleep(self.cfg.runtime.poll_interval_sec)

    def _banner(self) -> None:
        mode = "LIVE TRADING" if (self.cfg.live and not self.cfg.dry_run) else "DRY-RUN"
        net = "TESTNET" if self.cfg.client.testnet else "MAINNET"
        self.notifier.console(
            f"bybit-options-bot starting — mode={mode} net={net} "
            f"underlyings={','.join(self.cfg.runtime.underlyings)} "
            f"poll={self.cfg.runtime.poll_interval_sec:g}s"
        )
        if self.cfg.live and self.cfg.dry_run:
            self.notifier.console(
                "BYBIT_LIVE set but credentials missing — forced DRY-RUN (no orders will be sent)"
            )


def _check(cfg: Config) -> int:
    """One-shot health check: public market data + (if keys set) private auth."""
    client = BybitClient(cfg.client)
    net = "TESTNET" if cfg.client.testnet else "MAINNET"
    try:
        client.get_server_time()
        print(f"OK: reached Bybit {net} public API")
    except Exception as exc:
        print(f"FAILED: cannot reach Bybit {net} public API: {exc}")
        print("  (api.bybit.com is geo-blocked in some regions — run from a permitted IP)")
        return 1
    if not (cfg.client.api_key and cfg.client.api_secret):
        print("WARN: no API credentials set — scan/alert only (no trading possible)")
        return 0
    try:
        bal = client.get_wallet_balance()
        coins = (bal.get("list") or [{}])[0].get("totalEquity", "?")
        print(f"OK: API key authenticated (UNIFIED equity={coins})")
    except Exception as exc:
        print(f"FAILED: API auth failed: {exc}")
        return 1
    live = cfg.live and not cfg.dry_run
    print(f"mode={'LIVE TRADING' if live else 'DRY-RUN'} net={net} — ready")
    return 0


def _pnl(cfg: Config) -> int:
    if not (cfg.client.api_key and cfg.client.api_secret):
        print("FAILED: P&L needs API credentials (set BYBIT_API_KEY/SECRET)")
        return 1
    client = BybitClient(cfg.client)
    cats = ["option", cfg.runtime.perp_category]
    cats = list(dict.fromkeys(cats))
    try:
        report = build_report(client, cats)
    except Exception as exc:
        print(f"FAILED: {exc}")
        return 1
    text = format_report(report)
    print(text)
    Notifier(cfg.runtime.log_file, cfg.telegram).telegram_push(text)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Bybit cheap-options delta-neutral bot")
    parser.add_argument("--config", default="config.yaml", help="path to config.yaml")
    parser.add_argument("--once", action="store_true", help="run a single scan cycle and exit")
    parser.add_argument(
        "--no-exec", action="store_true", help="scan/alert only, never build or send trades"
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="run the full pipeline against a synthetic chain (offline, dry-run)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="probe Bybit connectivity + API auth, then exit (no trading)",
    )
    parser.add_argument(
        "--test-telegram", action="store_true", help="send a Telegram test message and exit"
    )
    parser.add_argument(
        "--telegram-chat-id",
        action="store_true",
        help="list chat/channel IDs the bot can see (to find your channel id)",
    )
    parser.add_argument(
        "--pnl", action="store_true", help="print a P&L report (and push to Telegram) then exit"
    )
    args = parser.parse_args(argv)

    cfg = load_config(args.config)

    if args.telegram_chat_id:
        ok, detail = Notifier(cfg.runtime.log_file, cfg.telegram).list_telegram_chats()
        print(detail)
        return 0 if ok else 1

    if args.test_telegram:
        ok, detail = Notifier(cfg.runtime.log_file, cfg.telegram).test_telegram()
        print(("OK: " if ok else "FAILED: ") + detail)
        return 0 if ok else 1

    if args.check:
        return _check(cfg)

    if args.pnl:
        return _pnl(cfg)
    if args.demo:
        cfg.dry_run = True  # demo never sends real orders
    bot = Bot(cfg, demo=args.demo)
    if args.demo and not args.once:
        args.once = True  # demo implies a single illustrative cycle
    if args.once:
        bot._banner()
        n = bot.run_cycle(allow_execute=not args.no_exec)
        bot.notifier.console(f"single cycle complete — {n} fresh signal(s)")
        return 0
    if args.no_exec:
        cfg.dry_run = True  # belt-and-suspenders
    bot.loop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
