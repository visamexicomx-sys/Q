"""Order execution — the only place that can send orders to Bybit.

Fails safe: in dry-run nothing is sent. Live execution requires `live=True`
AND credentials present (enforced in config.load_config, which forces dry_run
otherwise). The option leg is placed first; the delta hedge follows only if the
option order is accepted, so we never hold a naked hedge.
"""

from __future__ import annotations

import time

from .bybit_client import BybitClient, BybitError
from .notify import Notifier
from .strategy import OrderLeg, TradePlan


class Executor:
    def __init__(
        self,
        client: BybitClient | None,
        notifier: Notifier,
        live: bool,
        dry_run: bool,
        perp_category: str = "linear",
    ):
        self.client = client
        self.notifier = notifier
        self.live = live
        self.dry_run = dry_run
        self.perp_category = perp_category

    def execute(self, plan: TradePlan) -> bool:
        """Place the option + hedge. Returns True if the option order was sent live."""
        if self.dry_run or not self.live or self.client is None:
            self.notifier.emit_trade(plan, executed=False, detail="dry-run (no order sent)")
            return False

        link = f"opt-{int(time.time() * 1000)}"
        try:
            opt_res = self._send_option(plan.option_leg, link)
        except BybitError as exc:
            self.notifier.emit_trade(plan, executed=False, detail=f"option rejected: {exc}")
            return False
        except Exception as exc:  # network etc.
            self.notifier.emit_trade(plan, executed=False, detail=f"option error: {exc}")
            return False

        hedge_detail = "no hedge"
        if plan.hedge_leg is not None:
            try:
                self._send_hedge(plan.hedge_leg, link + "-h")
                hedge_detail = "hedged"
            except Exception as exc:
                # Option filled but hedge failed — surface loudly; we are now
                # directionally exposed and a human should intervene.
                hedge_detail = f"HEDGE FAILED ({exc}) — position is NOT delta-neutral"
                self.notifier.telegram_push(f"⚠️ {hedge_detail} for {plan.option_leg.symbol}")

        self.notifier.emit_trade(
            plan, executed=True, detail=f"orderId={opt_res.get('orderId', '?')}; {hedge_detail}"
        )
        return True

    def _send_option(self, leg: OrderLeg, link: str) -> dict:
        return self.client.place_order(
            category="option",
            symbol=leg.symbol,
            side=leg.side,
            order_type="Limit",
            qty=leg.qty,
            price=leg.price,
            time_in_force="GTC",
            reduce_only=leg.reduce_only,
            order_link_id=link,
        )

    def _send_hedge(self, leg: OrderLeg, link: str) -> dict:
        order_type = "Market" if leg.price is None else "Limit"
        return self.client.place_order(
            category=self.perp_category,
            symbol=leg.symbol,
            side=leg.side,
            order_type=order_type,
            qty=leg.qty,
            price=leg.price,
            time_in_force="IOC" if order_type == "Market" else "GTC",
            reduce_only=leg.reduce_only,
            order_link_id=link,
        )
