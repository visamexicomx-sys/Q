import os
import tempfile
import unittest

from bot.risk import RiskConfig, RiskManager, RiskState
from bot.strategy import OrderLeg, TradePlan
from tests.test_strategy import make_signal


def make_plan(premium=40.0, edge_pct=0.30, base_coin="BTC", reject=None):
    sig = make_signal(edge_pct=edge_pct, base_coin=base_coin)
    return TradePlan(
        signal=sig,
        option_leg=OrderLeg(sig.symbol, "Buy", 0.4, 100.0),
        hedge_leg=None,
        premium_usd=premium,
        expected_edge_usd=premium * edge_pct,
        net_delta_after_hedge=0.0,
        reject_reason=reject,
    )


class TestRisk(unittest.TestCase):
    def base_cfg(self, **kw):
        defaults = dict(
            max_premium_per_trade=50.0,
            max_total_premium=120.0,
            max_open_positions=3,
            max_positions_per_underlying=2,
            max_daily_loss=100.0,
            min_edge_pct=0.05,
            kill_switch_file=os.path.join(tempfile.mkdtemp(), ".KILL"),
        )
        defaults.update(kw)
        return RiskConfig(**defaults)

    def test_allows_normal_trade(self):
        rm = RiskManager(self.base_cfg())
        self.assertTrue(rm.check(make_plan()).allowed)

    def test_rejects_strategy_reject(self):
        rm = RiskManager(self.base_cfg())
        self.assertFalse(rm.check(make_plan(reject="too thin")).allowed)

    def test_per_trade_premium_cap(self):
        rm = RiskManager(self.base_cfg(max_premium_per_trade=30.0))
        self.assertFalse(rm.check(make_plan(premium=40.0)).allowed)

    def test_total_premium_cap(self):
        rm = RiskManager(self.base_cfg())
        rm.state.open_premium = 100.0
        self.assertFalse(rm.check(make_plan(premium=40.0)).allowed)  # 140 > 120

    def test_open_positions_cap(self):
        rm = RiskManager(self.base_cfg())
        rm.state.open_positions = 3
        self.assertFalse(rm.check(make_plan()).allowed)

    def test_per_underlying_cap(self):
        rm = RiskManager(self.base_cfg())
        rm.state.positions_per_underlying = {"BTC": 2}
        self.assertFalse(rm.check(make_plan(base_coin="BTC")).allowed)
        self.assertTrue(rm.check(make_plan(base_coin="ETH")).allowed)

    def test_daily_loss_halt(self):
        rm = RiskManager(self.base_cfg())
        rm.state.realized_pnl_today = -100.0
        self.assertTrue(rm.halted())
        self.assertFalse(rm.check(make_plan()).allowed)

    def test_kill_switch(self):
        cfg = self.base_cfg()
        rm = RiskManager(cfg)
        with open(cfg.kill_switch_file, "w") as fh:
            fh.write("stop")
        try:
            self.assertTrue(rm.halted())
            self.assertFalse(rm.check(make_plan()).allowed)
        finally:
            os.remove(cfg.kill_switch_file)

    def test_register_fill_and_close(self):
        rm = RiskManager(self.base_cfg())
        plan = make_plan(premium=40.0)
        rm.register_fill(plan)
        self.assertEqual(rm.state.open_positions, 1)
        self.assertAlmostEqual(rm.state.open_premium, 40.0)
        self.assertEqual(rm.state.positions_per_underlying["BTC"], 1)
        rm.register_close("BTC", 40.0, realized_pnl=12.0)
        self.assertEqual(rm.state.open_positions, 0)
        self.assertAlmostEqual(rm.state.open_premium, 0.0)
        self.assertAlmostEqual(rm.state.realized_pnl_today, 12.0)


if __name__ == "__main__":
    unittest.main()
