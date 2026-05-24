import math
import unittest

from bot.pricing import (
    black76_greeks,
    black76_price,
    implied_vol,
    years_to_expiry,
)


class TestPricing(unittest.TestCase):
    def test_put_call_parity(self):
        # Forward parity (r=0): C - P = F - K  (discounted, df=1 here).
        f, k, vol, t = 100.0, 90.0, 0.6, 0.25
        c = black76_price(f, k, vol, t, is_call=True)
        p = black76_price(f, k, vol, t, is_call=False)
        self.assertAlmostEqual(c - p, f - k, places=6)

    def test_intrinsic_floor_at_zero_vol(self):
        c = black76_price(100, 80, 1e-6, 0.5, is_call=True)
        self.assertAlmostEqual(c, 20.0, places=4)
        p = black76_price(100, 120, 1e-6, 0.5, is_call=False)
        self.assertAlmostEqual(p, 20.0, places=4)

    def test_implied_vol_roundtrip(self):
        f, k, t = 100.0, 105.0, 0.3
        for true_vol in (0.2, 0.5, 0.9, 1.5):
            for is_call in (True, False):
                price = black76_price(f, k, true_vol, t, is_call)
                solved = implied_vol(price, f, k, t, is_call)
                self.assertIsNotNone(solved)
                self.assertAlmostEqual(solved, true_vol, places=4)

    def test_implied_vol_below_intrinsic_returns_none(self):
        f, k, t = 100.0, 80.0, 0.5
        intrinsic = 20.0
        self.assertIsNone(implied_vol(intrinsic - 5.0, f, k, t, is_call=True))

    def test_greeks_signs(self):
        f, k, vol, t = 100.0, 100.0, 0.6, 0.25
        gc = black76_greeks(f, k, vol, t, is_call=True)
        gp = black76_greeks(f, k, vol, t, is_call=False)
        self.assertTrue(0 < gc.delta < 1)
        self.assertTrue(-1 < gp.delta < 0)
        self.assertGreater(gc.gamma, 0)
        self.assertGreater(gc.vega, 0)
        # ATM call/put gamma & vega match.
        self.assertAlmostEqual(gc.gamma, gp.gamma, places=8)
        self.assertAlmostEqual(gc.vega, gp.vega, places=8)
        # call delta - put delta == 1 (df=1)
        self.assertAlmostEqual(gc.delta - gp.delta, 1.0, places=6)

    def test_vega_matches_numerical(self):
        f, k, vol, t = 100.0, 110.0, 0.5, 0.4
        g = black76_greeks(f, k, vol, t, is_call=True)
        eps = 1e-4
        up = black76_price(f, k, vol + eps, t, True)
        dn = black76_price(f, k, vol - eps, t, True)
        numeric = (up - dn) / (2 * eps)
        self.assertAlmostEqual(g.vega, numeric, places=2)

    def test_years_to_expiry(self):
        now = 1_000_000_000_000
        one_year = now + int(365 * 24 * 3600 * 1000)
        self.assertAlmostEqual(years_to_expiry(one_year, now), 1.0, places=4)
        self.assertGreater(years_to_expiry(now - 1000, now), 0)  # never negative


if __name__ == "__main__":
    unittest.main()
