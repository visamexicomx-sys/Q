import unittest

from bot.pnl import (
    PnLReport,
    format_report,
    summarize_closed_pnl,
    summarize_positions,
)


class TestPnL(unittest.TestCase):
    def test_summarize_closed_pnl(self):
        records = [
            {"symbol": "BTC-X-100000-C", "closedPnl": "12.5"},
            {"symbol": "BTC-X-100000-C", "closedPnl": "-4.0"},
            {"symbol": "ETH-X-3500-C", "closedPnl": "3.25"},
        ]
        s = summarize_closed_pnl(records)
        self.assertEqual(s["count"], 3)
        self.assertAlmostEqual(s["realized"], 11.75)
        self.assertAlmostEqual(s["by_symbol"]["BTC-X-100000-C"], 8.5)
        self.assertAlmostEqual(s["by_symbol"]["ETH-X-3500-C"], 3.25)

    def test_summarize_positions_skips_zero_size(self):
        positions = [
            {"symbol": "BTCUSDT", "size": "0.01", "unrealisedPnl": "5.0"},
            {"symbol": "ETHUSDT", "size": "0", "unrealisedPnl": "99.0"},  # closed -> skip
            {"symbol": "SOLUSDT", "size": "2", "unrealisedPnl": "-1.5"},
        ]
        s = summarize_positions(positions)
        self.assertEqual(s["open"], 2)
        self.assertAlmostEqual(s["unrealized"], 3.5)
        self.assertNotIn("ETHUSDT", s["by_symbol"])

    def test_handles_missing_and_bad_fields(self):
        self.assertEqual(summarize_closed_pnl([{}])["realized"], 0.0)
        s = summarize_positions([{"size": "1", "unrealisedPnl": "not-a-number"}])
        self.assertEqual(s["unrealized"], 0.0)

    def test_report_net_and_format(self):
        r = PnLReport(
            realized_today=10.0,
            realized_all=25.0,
            unrealized=-3.0,
            open_positions=2,
            open_by_symbol={"BTCUSDT": -3.0},
        )
        self.assertAlmostEqual(r.net_today, 7.0)
        text = format_report(r)
        self.assertIn("Realized today: +10.00 USDC", text)
        self.assertIn("Net today: +7.00 USDC", text)
        self.assertIn("BTCUSDT", text)


if __name__ == "__main__":
    unittest.main()
