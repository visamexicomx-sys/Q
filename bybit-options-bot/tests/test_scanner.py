import math
import time
import unittest

from bot.pricing import black76_price
from bot.scanner import OptionQuote, ScanConfig, scan_underlying

NOW = int(time.time() * 1000)
EXPIRY = NOW + int(30 * 24 * 3600 * 1000)  # 30 days
F = 100_000.0


def smile_iv(strike: float) -> float:
    k = math.log(strike / F)
    return 0.60 + 1.0 * k * k


def make_quote(strike, is_call, ask_iv, *, bid_factor=0.97, ask_size=5.0, oi=100.0):
    """Quote whose ask is priced at `ask_iv`; mark sits on the fair smile."""
    mark_iv = smile_iv(strike)
    t = 30 / 365
    mark_price = black76_price(F, strike, mark_iv, t, is_call)
    ask = black76_price(F, strike, ask_iv, t, is_call)
    return OptionQuote(
        symbol=f"BTC-X-{int(strike)}-{'C' if is_call else 'P'}",
        base_coin="BTC",
        expiry_ms=EXPIRY,
        strike=strike,
        is_call=is_call,
        forward=F,
        bid=ask * bid_factor,
        bid_size=ask_size,
        ask=ask,
        ask_size=ask_size,
        mark_price=mark_price,
        mark_iv=mark_iv,
        ask_iv=None,  # force the scanner to solve it from the ask price
        delta=None,
        open_interest=oi,
    )


def fair_chain():
    quotes = []
    for strike in range(80_000, 125_000, 5_000):
        is_call = strike >= F
        iv = smile_iv(strike)
        quotes.append(make_quote(strike, is_call, iv))
    return quotes


class TestScanner(unittest.TestCase):
    def test_fairly_priced_chain_has_no_signals(self):
        signals = scan_underlying(fair_chain(), NOW)
        self.assertEqual(signals, [])

    def test_detects_cheap_vol(self):
        quotes = fair_chain()
        # Make the 105k call anomalously cheap: ask priced 15 vol points low.
        cheap_iv = smile_iv(105_000) - 0.15
        quotes.append(make_quote(105_000, True, cheap_iv))
        signals = scan_underlying(quotes, NOW)
        cheap = [s for s in signals if abs(s.strike - 105_000) < 1 and s.kind == "CHEAP_VOL"]
        self.assertTrue(cheap, "expected a CHEAP_VOL signal on the underpriced 105k call")
        sig = cheap[0]
        self.assertGreater(sig.edge_pct, 0.08)
        self.assertGreater(sig.vol_edge, 0.03)
        self.assertGreater(sig.fair_price, sig.ask)

    def test_detects_arbitrage_below_intrinsic(self):
        quotes = fair_chain()
        intrinsic = max(F - 80_000, 0.0)  # 20,000
        arb = make_quote(80_000, True, smile_iv(80_000))
        arb = OptionQuote(**{**arb.__dict__, "ask": intrinsic - 500, "bid": intrinsic - 800})
        quotes.append(arb)
        signals = scan_underlying(quotes, NOW)
        arbs = [s for s in signals if s.kind == "ARBITRAGE"]
        self.assertTrue(arbs, "expected an ARBITRAGE signal for ask below intrinsic")
        self.assertGreater(arbs[0].score, 1e5)  # arbitrage ranks above vol signals

    def test_wide_spread_rejected(self):
        quotes = fair_chain()
        cheap_iv = smile_iv(110_000) - 0.20
        q = make_quote(110_000, True, cheap_iv, bid_factor=0.30)  # ~70% spread
        quotes.append(q)
        signals = scan_underlying(quotes, NOW)
        self.assertFalse([s for s in signals if abs(s.strike - 110_000) < 1])

    def test_min_ask_size_filter(self):
        quotes = fair_chain()
        cheap_iv = smile_iv(95_000) - 0.20
        quotes.append(make_quote(95_000, False, cheap_iv, ask_size=0.0))
        cfg = ScanConfig(min_ask_size=1.0)
        signals = scan_underlying(quotes, NOW, cfg)
        self.assertFalse([s for s in signals if abs(s.strike - 95_000) < 1])


if __name__ == "__main__":
    unittest.main()
