import math
import time
import unittest

from bot.pricing import black76_price
from bot.scanner import OptionQuote, ScanConfig, scan_underlying

NOW = int(time.time() * 1000)
EXPIRY = NOW + int(30 * 24 * 3600 * 1000)
F = 100.0
T = 30 / 365


def smile_iv(strike):
    k = math.log(strike / F)
    return 0.60 + 1.0 * k * k


def fair_quote(strike, is_call):
    iv = smile_iv(strike)
    price = black76_price(F, strike, iv, T, is_call)
    return OptionQuote(
        symbol=f"BTC-X-{int(strike)}-{'C' if is_call else 'P'}",
        base_coin="BTC", expiry_ms=EXPIRY, strike=float(strike), is_call=is_call,
        forward=F, bid=price * 0.97, bid_size=5, ask=price, ask_size=5,
        mark_price=price, mark_iv=iv, ask_iv=None, open_interest=100,
    )


class TestCheapTail(unittest.TestCase):
    def _chain(self):
        return [fair_quote(k, k >= F) for k in range(80, 125, 5)]

    def _cheap_wing(self):
        # Deep-OTM call (delta < 0.05) going for "cents" — the vol filter skips
        # the wing, so only CHEAP_TAIL can catch it.
        return OptionQuote(
            symbol="BTC-X-160-C", base_coin="BTC", expiry_ms=EXPIRY, strike=160.0,
            is_call=True, forward=F, bid=0.04, bid_size=10, ask=0.08, ask_size=10,
            mark_price=0.06, mark_iv=smile_iv(160), ask_iv=None, open_interest=50,
        )

    def test_cheap_tail_detected(self):
        chain = self._chain()
        chain.append(self._cheap_wing())
        cfg = ScanConfig(cheap_tail_enabled=True, cheap_tail_max_price=5.0,
                         cheap_tail_min_ratio=2.0)
        sigs = scan_underlying(chain, NOW, cfg)
        tails = [s for s in sigs if s.kind == "CHEAP_TAIL"]
        self.assertTrue(tails, "expected a CHEAP_TAIL signal on the 8-cent 160 call")
        t = tails[0]
        self.assertEqual(t.strike, 160.0)
        self.assertTrue(t.tradeable)  # single-leg, the bot can buy it
        self.assertGreaterEqual(t.fair_price, t.ask * 2.0)
        self.assertLess(abs(t.delta), 0.05)  # lives in the wing (vol filter skips it)

    def test_cheap_tail_disabled(self):
        chain = self._chain()
        chain.append(self._cheap_wing())
        cfg = ScanConfig(cheap_tail_enabled=False, structural_arb_enabled=False)
        sigs = scan_underlying(chain, NOW, cfg)
        self.assertFalse([s for s in sigs if s.kind == "CHEAP_TAIL"])

    def test_not_cheap_when_priced_fairly(self):
        # A fairly-priced cheap wing option must NOT be flagged.
        chain = self._chain()
        cfg = ScanConfig(cheap_tail_enabled=True, cheap_tail_max_price=5.0)
        sigs = scan_underlying(chain, NOW, cfg)
        self.assertFalse([s for s in sigs if s.kind == "CHEAP_TAIL"])


if __name__ == "__main__":
    unittest.main()
