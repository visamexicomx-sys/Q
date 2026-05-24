import unittest

from bot.scanner import Signal
from bot.strategy import InstrumentSpec, StrategyConfig, build_trade_plan


def make_signal(**overrides):
    base = dict(
        kind="CHEAP_VOL",
        symbol="BTC-X-105000-C",
        base_coin="BTC",
        is_call=True,
        strike=105_000.0,
        expiry_ms=0,
        days_to_expiry=30.0,
        forward=100_000.0,
        ask=100.0,
        ask_size=5.0,
        fair_price=130.0,
        fair_iv=0.6,
        ask_iv=0.45,
        edge_usd=30.0,
        edge_pct=0.30,
        vol_edge=0.15,
        resid_sigma=5.0,
        delta=0.45,
        gamma=0.0,
        vega=0.0,
        score=42.0,
    )
    base.update(overrides)
    return Signal(**base)


OPT = InstrumentSpec(symbol="BTC-X-105000-C", qty_step=0.01, min_qty=0.01, tick_size=0.1)
PERP = InstrumentSpec(symbol="BTCUSDT", qty_step=0.001, min_qty=0.001, tick_size=0.1)


class TestStrategy(unittest.TestCase):
    def test_sizes_within_premium_budget(self):
        cfg = StrategyConfig(max_premium_per_trade=50.0, max_contracts_per_trade=10.0)
        plan = build_trade_plan(make_signal(ask=100.0), OPT, cfg, PERP)
        self.assertIsNone(plan.reject_reason)
        self.assertLessEqual(plan.premium_usd, 50.0 + 1e-9)
        # 50 USDC / 100 price = 0.5 contracts (rounded to step).
        self.assertAlmostEqual(plan.option_leg.qty, 0.5, places=6)

    def test_caps_to_ask_size(self):
        cfg = StrategyConfig(max_premium_per_trade=10_000.0, max_contracts_per_trade=100.0)
        plan = build_trade_plan(make_signal(ask=10.0, ask_size=3.0), OPT, cfg, PERP)
        self.assertAlmostEqual(plan.option_leg.qty, 3.0, places=6)

    def test_hedge_neutralises_delta_call(self):
        cfg = StrategyConfig(max_premium_per_trade=1000.0, max_contracts_per_trade=10.0)
        plan = build_trade_plan(make_signal(delta=0.5, ask=100.0), OPT, cfg, PERP)
        self.assertIsNotNone(plan.hedge_leg)
        self.assertEqual(plan.hedge_leg.side, "Sell")  # long call delta -> sell perp
        self.assertAlmostEqual(abs(plan.net_delta_after_hedge), 0.0, places=3)

    def test_hedge_direction_put(self):
        cfg = StrategyConfig(max_premium_per_trade=1000.0)
        plan = build_trade_plan(
            make_signal(is_call=False, delta=-0.4, ask=100.0), OPT, cfg, PERP
        )
        self.assertEqual(plan.hedge_leg.side, "Buy")  # long put delta(-) -> buy perp
        self.assertAlmostEqual(abs(plan.net_delta_after_hedge), 0.0, places=3)

    def test_rejects_when_ask_above_fair_minus_margin(self):
        cfg = StrategyConfig(safety_margin=0.02)
        # ask 129 vs fair 130 -> cap is 127.4, ask above cap -> reject.
        plan = build_trade_plan(make_signal(ask=129.0, fair_price=130.0), OPT, cfg, PERP)
        self.assertIsNotNone(plan.reject_reason)

    def test_rejects_when_below_min_qty(self):
        cfg = StrategyConfig(max_premium_per_trade=0.5, max_contracts_per_trade=10.0)
        # budget 0.5 / ask 100 = 0.005 < min_qty 0.01 -> reject.
        plan = build_trade_plan(make_signal(ask=100.0), OPT, cfg, PERP)
        self.assertIsNotNone(plan.reject_reason)

    def test_no_hedge_when_disabled(self):
        cfg = StrategyConfig(max_premium_per_trade=1000.0, hedge_enabled=False)
        plan = build_trade_plan(make_signal(), OPT, cfg, PERP)
        self.assertIsNone(plan.hedge_leg)


if __name__ == "__main__":
    unittest.main()
