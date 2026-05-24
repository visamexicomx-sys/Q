"""Notifications: console, JSONL signal log, and optional Telegram push."""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone

import requests

from .config import TelegramConfig
from .scanner import Signal
from .strategy import TradePlan


def _ts(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%d%b%y").upper()


_KIND_TAG = {
    "ARBITRAGE": "ARB",
    "CHEAP_VOL": "CHEAP",
    "CHEAP_TAIL": "TAIL",
    "PARITY_ARB": "PARITY",
    "VERTICAL_ARB": "VERT",
    "BUTTERFLY_ARB": "FLY",
}

_KIND_EMOJI = {
    "ARBITRAGE": "\U0001f6a8",  # siren
    "CHEAP_VOL": "\U0001fa99",  # coin
    "CHEAP_TAIL": "\U0001f3b0",  # slot machine (lottery / "за центы")
    "PARITY_ARB": "⚖️",  # scales
    "VERTICAL_ARB": "\U0001f4d0",  # triangle ruler
    "BUTTERFLY_ARB": "\U0001f98b",  # butterfly
}


def signal_line(sig: Signal) -> str:
    tag = _KIND_TAG.get(sig.kind, sig.kind)
    if not sig.tradeable:  # multi-leg structural arb
        return (
            f"[{tag}] {sig.base_coin} {_ts(sig.expiry_ms)} edge={sig.edge_usd:.2f}USDC "
            f"{sig.days_to_expiry:.0f}d | {sig.legs}"
        )
    cp = "C" if sig.is_call else "P"
    return (
        f"[{tag}] {sig.base_coin} {_ts(sig.expiry_ms)} {sig.strike:g}{cp} "
        f"ask={sig.ask:g} fair={sig.fair_price:.2f} "
        f"edge={sig.edge_pct:.0%}/{sig.edge_usd:.2f}USDC "
        f"askIV={sig.ask_iv:.0%} fairIV={sig.fair_iv:.0%} "
        f"Δ={sig.delta:+.2f} {sig.days_to_expiry:.0f}d score={sig.score:.1f}"
    )


class Notifier:
    def __init__(self, log_file: str, telegram: TelegramConfig | None = None):
        self.log_file = log_file
        self.telegram = telegram
        if log_file:
            os.makedirs(os.path.dirname(log_file) or ".", exist_ok=True)

    def console(self, msg: str) -> None:
        stamp = datetime.now(timezone.utc).strftime("%H:%M:%S")
        print(f"{stamp} {msg}", flush=True)

    def log_event(self, event: dict) -> None:
        if not self.log_file:
            return
        event = {"ts": int(time.time() * 1000), **event}
        with open(self.log_file, "a") as fh:
            fh.write(json.dumps(event, default=str) + "\n")

    def emit_signal(self, sig: Signal) -> None:
        line = signal_line(sig)
        self.console(line)
        self.log_event({"type": "signal", "signal": sig.__dict__})
        emoji = _KIND_EMOJI.get(sig.kind, "\U0001fa99")
        self.telegram_push(f"{emoji} {sig.kind}\n{line}")

    def emit_trade(self, plan: TradePlan, executed: bool, detail: str = "") -> None:
        tag = "FILLED" if executed else "PLAN"
        opt = plan.option_leg
        msg = (
            f"[{tag}] {opt.side} {opt.qty:g} {opt.symbol} @ {opt.price} "
            f"premium={plan.premium_usd:.2f} edge≈{plan.expected_edge_usd:.2f}USDC"
        )
        if plan.hedge_leg:
            h = plan.hedge_leg
            msg += f" | hedge {h.side} {h.qty:g} {h.symbol}"
        if detail:
            msg += f" — {detail}"
        self.console(msg)
        self.log_event(
            {
                "type": "trade",
                "executed": executed,
                "detail": detail,
                "option_leg": plan.option_leg.__dict__,
                "hedge_leg": plan.hedge_leg.__dict__ if plan.hedge_leg else None,
                "premium_usd": plan.premium_usd,
                "expected_edge_usd": plan.expected_edge_usd,
                "signal": plan.signal.__dict__,
            }
        )
        if executed:
            self.telegram_push(f"✅ {msg}")

    def telegram_push(self, text: str) -> None:
        tg = self.telegram
        if not tg or not tg.enabled or not tg.bot_token or not tg.chat_id:
            return
        try:
            requests.post(
                f"https://api.telegram.org/bot{tg.bot_token}/sendMessage",
                json={"chat_id": tg.chat_id, "text": text, "disable_web_page_preview": True},
                timeout=8,
            )
        except requests.RequestException as exc:
            self.console(f"telegram push failed: {exc}")

    def list_telegram_chats(self) -> tuple[bool, str]:
        """List chats/channels the bot can see (via getUpdates) to find chat_id.

        For a channel: add the bot as an admin, post once, then run this.
        """
        tg = self.telegram
        if not tg or not tg.bot_token:
            return False, "missing TELEGRAM_BOT_TOKEN"
        try:
            r = requests.get(
                f"https://api.telegram.org/bot{tg.bot_token}/getUpdates", timeout=8
            )
            data = r.json()
            if not data.get("ok"):
                return False, f"telegram API: {r.status_code} {r.text[:200]}"
            seen: dict[str, str] = {}
            for upd in data.get("result", []):
                msg = upd.get("message") or upd.get("channel_post") or {}
                chat = msg.get("chat") or {}
                cid = chat.get("id")
                if cid is not None:
                    title = chat.get("title") or chat.get("username") or chat.get("type", "")
                    seen[str(cid)] = title
            if not seen:
                return False, "no chats seen — post a message in the channel/chat first"
            lines = "\n".join(f"  {cid}  {title}" for cid, title in seen.items())
            return True, "chats visible to the bot:\n" + lines
        except requests.RequestException as exc:
            return False, f"network error: {exc}"

    def test_telegram(self) -> tuple[bool, str]:
        """Send a probe message and surface the outcome (for --test-telegram)."""
        tg = self.telegram
        if not tg or not tg.bot_token or not tg.chat_id:
            return False, "missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID"
        try:
            r = requests.post(
                f"https://api.telegram.org/bot{tg.bot_token}/sendMessage",
                json={"chat_id": tg.chat_id, "text": "✅ bybit-options-bot: Telegram connected."},
                timeout=8,
            )
            if r.ok and r.json().get("ok"):
                return True, "message delivered"
            return False, f"telegram API: {r.status_code} {r.text[:200]}"
        except requests.RequestException as exc:
            return False, f"network error: {exc}"
