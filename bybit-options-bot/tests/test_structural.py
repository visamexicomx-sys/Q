import time
import unittest

from bot.scanner import OptionQuote, ScanConfig
from bot.structural import detect_structural

NOW = int(time.time() * 1000)
EXPIRY = NOW + int(30 * 24 * 3600 * 1000)
T = 30 / 365
F = 100.0


def q(strike, is_call, bid, ask):
    return OptionQuote(
        symbol=f"X-{strike}-{'C' if is_call else 'P'}",
        base_coin="BTC",
        expiry_ms=EXPIRY,
        strike=float(strike),
        is_call=is_call,
        forward=F,
        bid=bid,
        bid_size=5,
        ask=ask,
        ask_size=5,
        mark_price=(bid + ask) / 2,
        mark_iv=0.6,
    )


class TestStructural(unittest.TestCase):
    def setUp(self):
        # Zero fees + low edge floor so planted edges survive in the test.
        self.cfg = ScanConfig(fee_rate=0.0, perp_fee_rate=0.0, min_arb_edge_usd=0.1)

    def test_no_arb_on_consistent_book(self):
        group = [
            q(90, True, 11.0, 11.5), q(100, True, 5.0, 5.5), q(110, True, 2.0, 2.5),
            q(90, False, 1.0, 1.5), q(100, False, 5.0, 5.5), q(110, False, 12.0, 12.5),
        ]
        self.assertEqual(detect_structural(group, T, 30.0, self.cfg), [])

    def test_vertical_call_arbitrage(self):
        # 110C bid (3.2) above 100C ask (2.5): sell 110C / buy 100C for a credit.
        group = [q(100, True, 2.0, 2.5), q(110, True, 3.2, 3.5)]
        sigs = detect_structural(group, T, 30.0, self.cfg)
        verts = [s for s in sigs if s.kind == "VERTICAL_ARB"]
        self.assertTrue(verts)
        self.assertFalse(verts[0].tradeable)
        self.assertAlmostEqual(verts[0].edge_usd, 0.7, places=6)

    def test_vertical_put_arbitrage(self):
        # 90P bid (5.0) above 100P ask (4.5): a lower-strike put richer than higher.
        group = [q(90, False, 5.0, 5.5), q(100, False, 4.0, 4.5)]
        sigs = detect_structural(group, T, 30.0, self.cfg)
        verts = [s for s in sigs if s.kind == "VERTICAL_ARB"]
        self.assertTrue(verts)
        self.assertAlmostEqual(verts[0].edge_usd, 0.5, places=6)

    def test_parity_arbitrage(self):
        # F=K=100 -> fair C-P=0. Call cheap (2.5) vs put rich (6.0 bid).
        group = [q(100, True, 2.0, 2.5), q(100, False, 6.0, 6.5)]
        sigs = detect_structural(group, T, 30.0, self.cfg)
        par = [s for s in sigs if s.kind == "PARITY_ARB"]
        self.assertTrue(par)
        self.assertAlmostEqual(par[0].edge_usd, 3.5, places=6)  # 0 - (2.5 - 6.0)

    def test_butterfly_arbitrage(self):
        # Monotone calls, but middle too rich -> convexity break.
        # cost = 8.0 - 2*6.5 + 4.0 = -1.0  => edge 1.0
        group = [q(90, True, 7.5, 8.0), q(100, True, 6.5, 6.7), q(110, True, 3.6, 4.0)]
        sigs = detect_structural(group, T, 30.0, self.cfg)
        fly = [s for s in sigs if s.kind == "BUTTERFLY_ARB"]
        self.assertTrue(fly)
        self.assertFalse(fly[0].tradeable)
        self.assertAlmostEqual(fly[0].edge_usd, 1.0, places=6)
        # No vertical false-positive on this monotone book.
        self.assertFalse([s for s in sigs if s.kind == "VERTICAL_ARB"])

    def test_all_structural_alert_only(self):
        group = [q(100, True, 2.0, 2.5), q(110, True, 3.2, 3.5)]
        sigs = detect_structural(group, T, 30.0, self.cfg)
        self.assertTrue(sigs and all(not s.tradeable for s in sigs))


if __name__ == "__main__":
    unittest.main()
