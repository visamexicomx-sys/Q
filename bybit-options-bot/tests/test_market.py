import unittest

from bot.market import (
    build_instrument_specs,
    build_option_quotes,
    expiry_map,
    parse_option_symbol,
)


class TestMarket(unittest.TestCase):
    def test_parse_option_symbol(self):
        self.assertEqual(parse_option_symbol("BTC-27JUN25-60000-C"), ("BTC", 60000.0, True))
        self.assertEqual(parse_option_symbol("ETH-3JAN25-3200-P"), ("ETH", 3200.0, False))
        self.assertIsNone(parse_option_symbol("BTCUSDT"))
        self.assertIsNone(parse_option_symbol("BTC-27JUN25-foo-C"))

    def test_instrument_specs_and_expiry(self):
        instruments = [
            {
                "symbol": "BTC-27JUN25-60000-C",
                "deliveryTime": "1751011200000",
                "lotSizeFilter": {"qtyStep": "0.01", "minOrderQty": "0.01"},
                "priceFilter": {"tickSize": "5"},
            }
        ]
        specs = build_instrument_specs(instruments)
        self.assertIn("BTC-27JUN25-60000-C", specs)
        spec = specs["BTC-27JUN25-60000-C"]
        self.assertEqual(spec.qty_step, 0.01)
        self.assertEqual(spec.min_qty, 0.01)
        self.assertEqual(spec.tick_size, 5.0)
        self.assertEqual(expiry_map(instruments)["BTC-27JUN25-60000-C"], 1751011200000)

    def test_build_option_quotes_filters_and_parses(self):
        expiries = {"BTC-27JUN25-60000-C": 1751011200000}
        tickers = [
            {
                "symbol": "BTC-27JUN25-60000-C",
                "bid1Price": "1200",
                "bid1Size": "2",
                "ask1Price": "1250",
                "ask1Size": "3",
                "markPrice": "1225",
                "markIv": "0.55",
                "ask1Iv": "0.54",
                "underlyingPrice": "61000",
                "delta": "0.52",
                "openInterest": "10",
            },
            # No ask -> skipped.
            {"symbol": "BTC-27JUN25-70000-C", "ask1Price": "0", "underlyingPrice": "61000"},
            # Unknown expiry -> skipped.
            {"symbol": "BTC-27JUN25-99999-C", "ask1Price": "5", "underlyingPrice": "61000"},
        ]
        quotes = build_option_quotes(tickers, expiries, "BTC")
        self.assertEqual(len(quotes), 1)
        q = quotes[0]
        self.assertEqual(q.strike, 60000.0)
        self.assertTrue(q.is_call)
        self.assertEqual(q.ask, 1250.0)
        self.assertEqual(q.ask_iv, 0.54)
        self.assertEqual(q.delta, 0.52)
        self.assertEqual(q.forward, 61000.0)


if __name__ == "__main__":
    unittest.main()
