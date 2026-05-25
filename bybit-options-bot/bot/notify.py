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


_RU_MONTHS = ["", "янв", "фев", "мар", "апр", "май", "июн",
              "июл", "авг", "сен", "окт", "ноя", "дек"]


def _ts(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%d%b%y").upper()


def _ts_ru(ms: int) -> str:
    d = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
    return f"{d.day} {_RU_MONTHS[d.month]} {d.year}"


def _ts_short(ms: int) -> str:
    d = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
    return f"{d.day}.{d.month:02d}"


def _esc(s: str) -> str:
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


_KIND_TAG = {
    "ARBITRAGE": "ARB",
    "CHEAP_VOL": "CHEAP",
    "CHEAP_TAIL": "TAIL",
    "PARITY_ARB": "PARITY",
    "VERTICAL_ARB": "VERT",
    "BUTTERFLY_ARB": "FLY",
}

# emoji, Russian title, one-line plain-language explanation + suggested action.
_KIND_INFO = {
    "ARBITRAGE": ("\U0001f6a8", "АРБИТРАЖ",
                  "Аск ниже внутренней стоимости — почти безрисковая прибыль. Купить."),
    "CHEAP_VOL": ("\U0001fa99", "ДЕШЁВАЯ ВОЛАТИЛЬНОСТЬ",
                  "IV аска ниже справедливой улыбки. Купить опцион + захеджировать дельту перпом (бета-нейтрально)."),
    "CHEAP_TAIL": ("\U0001f3b0", "ДЕШЁВЫЙ ХВОСТ «за центы»",
                   "Дальний OTM за копейки — модель оценивает в разы дороже. Лотерейный билет: купить и держать."),
    "PARITY_ARB": ("⚖️", "ПУТ-КОЛЛ ПАРИТЕТ",
                   "Нарушен паритет call−put vs форвард. Безмодельный арбитраж — исполнять все ноги одновременно."),
    "VERTICAL_ARB": ("\U0001f4d0", "ВЕРТИКАЛЬНЫЙ АРБИТРАЖ",
                     "Цены по страйку нарушают монотонность — риск-фри кредит-спред. Все ноги вместе."),
    "BUTTERFLY_ARB": ("\U0001f98b", "БАБОЧКА (выпуклость)",
                      "Средний страйк дисбалансирован — риск-фри бабочка. Все ноги вместе."),
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


def signal_html(sig: Signal) -> str:
    """Rich, human-readable HTML message for Telegram."""
    emoji, title, explain = _KIND_INFO.get(sig.kind, ("\U0001fa99", sig.kind, ""))
    head = f"{emoji} <b>{title}</b>"
    exp = f"{_ts_ru(sig.expiry_ms)} ({sig.days_to_expiry:.0f} дн)"

    if not sig.tradeable:  # structural, multi-leg, alert-only
        lines = [
            head,
            f"<b>{_esc(sig.base_coin)}</b> · {exp}",
            f"💰 Заработок: <b>{sig.edge_usd:.2f} USDC</b>",
            f"🦵 Ноги: <code>{_esc(sig.legs)}</code>",
            "",
            f"ℹ️ {explain}",
        ]
        return "\n".join(lines)

    cp = "колл" if sig.is_call else "пут"
    max_cost = sig.ask * sig.ask_size  # cost to lift the whole resting ask
    lines = [
        head,
        f"<b>{_esc(sig.base_coin)}</b> · {cp} · страйк <b>{sig.strike:g}</b> · {exp}",
        f"🏷 Аск: <b>{sig.ask:g} USDC</b> → справедливо <b>{sig.fair_price:.2f}</b>",
        f"📈 Выгода: <b>{sig.edge_pct:.0%}</b>  (+{sig.edge_usd:.2f} USDC / контракт)",
        f"📦 Доступно на аске: <b>{sig.ask_size:g}</b> монет (≈ {max_cost:.2f} USDC) · бид {sig.bid:g}",
        f"📊 OI {sig.open_interest:g} · объём 24ч {sig.volume_24h:g}",
    ]
    if sig.kind != "ARBITRAGE":
        lines.append(f"🌊 Волатильность: аск <b>{sig.ask_iv:.0%}</b> vs модель <b>{sig.fair_iv:.0%}</b>")
    lines.append(f"⚖️ Дельта: <b>{sig.delta:+.2f}</b>")
    lines += ["", f"ℹ️ {explain}"]
    return "\n".join(lines)


def startup_html(mode: str, net: str, underlyings: list[str], poll: float) -> str:
    return "\n".join([
        "🚀 <b>Сканер аномалий запущен</b>",
        f"Режим: <b>{_esc(mode)}</b> · Сеть: <b>{_esc(net)}</b>",
        f"Монеты: <b>{_esc(', '.join(underlyings))}</b>",
        f"Период скана: каждые {poll:g} сек",
        "Ищу: арбитраж · дешёвую волатильность · «за центы» · паритет · вертикаль · бабочку",
    ])


def _digest_line(sig: Signal) -> str:
    emoji = _KIND_INFO.get(sig.kind, ("•",))[0]
    if not sig.tradeable:  # structural multi-leg
        return (f"{emoji} <b>{_esc(sig.base_coin)}</b> {_KIND_TAG.get(sig.kind, sig.kind)} "
                f"+{sig.edge_usd:.2f}$ — <code>{_esc(sig.legs)}</code>")
    cp = "к" if sig.is_call else "п"
    if sig.kind == "CHEAP_TAIL":
        ratio = sig.fair_price / sig.ask if sig.ask else 0.0
        extra = f"×{ratio:.1f}"
    elif sig.kind == "ARBITRAGE":
        extra = "арбитраж"
    else:
        extra = f"IV {sig.ask_iv:.0%}→{sig.fair_iv:.0%}"
    return (f"{emoji} <b>{_esc(sig.base_coin)}</b> {sig.strike:g}{cp} {_ts_short(sig.expiry_ms)} "
            f"— аск <b>{sig.ask:g}</b>, +{sig.edge_pct:.0%} ({extra}), "
            f"{sig.ask_size:g} монет")


def digest_html(signals: list[Signal], limit: int = 25) -> str:
    """Consolidated list of the current anomalies (sorted by score)."""
    if not signals:
        return "📋 <b>Аномалии сейчас:</b> нет"
    ordered = sorted(signals, key=lambda s: s.score, reverse=True)
    head = f"📋 <b>Список аномалий сейчас: {len(ordered)}</b>"
    lines = [head] + [_digest_line(s) for s in ordered[:limit]]
    if len(ordered) > limit:
        lines.append(f"…и ещё {len(ordered) - limit} (см. отдельные сообщения)")
    return "\n".join(lines)


def heartbeat_html(stats: dict, cycles: int, minutes: float) -> str:
    """Periodic full-info status: coins, options scanned, anomalies by type."""
    per = stats.get("per_coin", {})
    by_kind = stats.get("by_kind", {})
    coin_bits = " / ".join(
        f"{c} {d['options']}" for c, d in per.items()
    ) or "—"
    lines = [
        "💓 <b>Сканер активен</b>",
        f"За последние {minutes:g} мин: <b>{cycles}</b> циклов",
        f"Просканировано: <b>{stats.get('scanned', 0)}</b> опционов "
        f"({coin_bits}), экспираций: {stats.get('expiries', 0)}",
    ]
    if by_kind:
        order = ["ARBITRAGE", "CHEAP_VOL", "CHEAP_TAIL", "PARITY_ARB",
                 "VERTICAL_ARB", "BUTTERFLY_ARB"]
        parts = []
        for k in order:
            if by_kind.get(k):
                emoji = _KIND_INFO.get(k, ("•",))[0]
                parts.append(f"{emoji} {_KIND_TAG.get(k, k)}: <b>{by_kind[k]}</b>")
        lines.append("Аномалии сейчас: " + (" · ".join(parts) if parts else "нет"))
    else:
        lines.append("Аномалии сейчас: <b>нет</b>")
    return "\n".join(lines)


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
        self.console(signal_line(sig))
        self.log_event({"type": "signal", "signal": sig.__dict__})
        self.telegram_push(signal_html(sig), html=True)

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
            self.telegram_push(self._trade_html(plan, detail), html=True)

    def _trade_html(self, plan: TradePlan, detail: str) -> str:
        opt = plan.option_leg
        lines = [
            "✅ <b>СДЕЛКА ИСПОЛНЕНА</b>",
            f"🛒 Покупка <b>{opt.qty:g}</b> {_esc(opt.symbol)} @ <b>{opt.price}</b>",
            f"💵 Премия: <b>{plan.premium_usd:.2f} USDC</b> · ожид. выгода ≈ {plan.expected_edge_usd:.2f}",
        ]
        if plan.hedge_leg:
            h = plan.hedge_leg
            lines.append(f"🛡 Хедж: {h.side} <b>{h.qty:g}</b> {_esc(h.symbol)} (дельта-нейтрально)")
        if detail:
            lines.append(f"<i>{_esc(detail)}</i>")
        return "\n".join(lines)

    def telegram_push(self, text: str, html: bool = False) -> None:
        tg = self.telegram
        if not tg or not tg.enabled or not tg.bot_token or not tg.chat_id:
            return
        payload = {"chat_id": tg.chat_id, "text": text, "disable_web_page_preview": True}
        if html:
            payload["parse_mode"] = "HTML"
        try:
            requests.post(
                f"https://api.telegram.org/bot{tg.bot_token}/sendMessage",
                json=payload,
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
