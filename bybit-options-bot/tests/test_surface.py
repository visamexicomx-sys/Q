import unittest

from bot.surface import SmilePoint, fit_smile


class TestSurface(unittest.TestCase):
    def test_recovers_known_quadratic(self):
        a, b, c = 0.6, -0.2, 1.5
        pts = []
        for k in (-0.3, -0.2, -0.1, 0.0, 0.1, 0.2, 0.3):
            iv = a + b * k + c * k * k
            pts.append(SmilePoint(k=k, iv=iv, weight=1.0))
        smile = fit_smile(1, pts)
        self.assertIsNotNone(smile)
        self.assertAlmostEqual(smile.a, a, places=4)
        self.assertAlmostEqual(smile.b, b, places=4)
        self.assertAlmostEqual(smile.c, c, places=4)
        self.assertAlmostEqual(smile.fair_iv(0.15), a + b * 0.15 + c * 0.15**2, places=4)

    def test_few_points_fallback_to_median(self):
        pts = [SmilePoint(k=-0.1, iv=0.5, weight=1.0), SmilePoint(k=0.1, iv=0.7, weight=1.0)]
        smile = fit_smile(1, pts, min_points=4)
        self.assertIsNotNone(smile)
        self.assertAlmostEqual(smile.fallback_iv, 0.6, places=6)
        # Flat smile at the median.
        self.assertAlmostEqual(smile.fair_iv(0.5), 0.6, places=6)

    def test_outlier_rejection(self):
        a, b, c = 0.6, 0.0, 1.0
        pts = []
        for k in (-0.3, -0.2, -0.1, 0.0, 0.1, 0.2, 0.3):
            pts.append(SmilePoint(k=k, iv=a + b * k + c * k * k, weight=1.0))
        # Inject one wild outlier.
        pts.append(SmilePoint(k=0.05, iv=3.0, weight=1.0))
        smile = fit_smile(1, pts)
        self.assertIsNotNone(smile)
        # Fit should still be close to the clean curve despite the outlier.
        self.assertAlmostEqual(smile.fair_iv(0.0), a, places=2)

    def test_empty_returns_none(self):
        self.assertIsNone(fit_smile(1, []))


if __name__ == "__main__":
    unittest.main()
