import unittest

from bot.backtest import (
    Backtester,
    BacktestConfig,
    BacktestResult,
    BTTrade,
    generate_synthetic,
)
from bot.scanner import ScanConfig
from bot.strategy import StrategyConfig


def _closed(pnl, premium, exit_ts, kind="CHEAP_VOL"):
    t = BTTrade(kind=kind, symbol="X", coin="BTC", is_call=True, strike=1, expiry_ms=1,
                qty=1, entry_price=1, premium=premium, delta=0.4, entry_forward=1,
                hedge_qty=0, hedge_side="", entry_ts=0, edge_usd=1)
    t.pnl = pnl
    t.exit_ts = exit_ts
    t.status = "closed"
    return t


class TestBacktestMetrics(unittest.TestCase):
    def test_metrics_basic(self):
        r = BacktestResult(trades=[
            _closed(10.0, 50.0, 1),
            _closed(-4.0, 40.0, 2),
            _closed(6.0, 30.0, 3),
        ])
        m = r.metrics()
        self.assertEqual(m["trades"], 3)
        self.assertAlmostEqual(m["total_pnl"], 12.0)
        self.assertAlmostEqual(m["win_rate"], 2 / 3)
        self.assertAlmostEqual(m["profit_factor"], 16.0 / 4.0)
        # Equity curve 10 -> 6 -> 12; peak 10 then dip to 6 => drawdown 4.
        self.assertAlmostEqual(m["max_drawdown"], 4.0)

    def test_empty(self):
        self.assertEqual(BacktestResult().metrics(), {"trades": 0})


class TestBacktestRun(unittest.TestCase):
    def test_to_expiry_produces_closed_trades(self):
        snaps, settle = generate_synthetic(seed=1)
        bt = Backtester(ScanConfig(), StrategyConfig(), BacktestConfig(mode="to_expiry"))
        res = bt.run(snaps, settle)
        m = res.metrics()
        self.assertGreater(m["trades"], 0)
        for key in ("total_pnl", "win_rate", "max_drawdown", "sharpe_per_trade", "by_kind"):
            self.assertIn(key, m)
        # Every trade entered once and closed at settlement.
        self.assertTrue(all(t.status == "closed" for t in res.trades))

    def test_convergence_mode_is_positive(self):
        # Convergence captures a fraction of a positive edge on every trade.
        snaps, settle = generate_synthetic(seed=3)
        bt = Backtester(ScanConfig(), StrategyConfig(),
                        BacktestConfig(mode="convergence", convergence_factor=0.5))
        res = bt.run(snaps, settle)
        m = res.metrics()
        self.assertGreater(m["trades"], 0)
        self.assertGreater(m["total_pnl"], 0.0)

    def test_no_duplicate_symbol_entries(self):
        snaps, settle = generate_synthetic(seed=5)
        bt = Backtester(ScanConfig(), StrategyConfig(), BacktestConfig())
        res = bt.run(snaps, settle)
        syms = [t.symbol for t in res.trades]
        self.assertEqual(len(syms), len(set(syms)))  # each symbol entered at most once


if __name__ == "__main__":
    unittest.main()
