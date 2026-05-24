"""Per-expiry implied-vol smile fitting.

For each expiry we fit a quadratic smile  iv(k) = a + b*k + c*k^2  in
log-moneyness k = ln(K/F), using weighted least squares with one round of
robust (MAD-based) outlier rejection. The fitted curve is the "fair" IV that we
compare market quotes against to spot anomalously cheap options.

Quadratic is a deliberate choice: it is the smallest model that captures skew
(b) and curvature/smile (c) while staying robust on the handful of liquid
strikes a crypto expiry typically offers. Pure standard library.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass


@dataclass
class SmilePoint:
    k: float  # log-moneyness ln(K/F)
    iv: float  # observed (mark) implied vol
    weight: float  # liquidity-derived weight


@dataclass
class Smile:
    expiry_ms: int
    a: float
    b: float
    c: float
    n_points: int
    residual_std: float  # robust std of residuals, in vol points
    fallback_iv: float  # median iv, used when the fit is degenerate
    k_lo: float = 0.0  # observed log-moneyness range (for clamped extrapolation)
    k_hi: float = 0.0

    def fair_iv(self, k: float) -> float:
        # Clamp to the observed strike range: a quadratic extrapolated into the
        # far wings explodes and would fake "cheap" options. Clamping keeps the
        # tail fair IV at the nearest fitted edge.
        if self.k_hi > self.k_lo:
            k = max(self.k_lo, min(self.k_hi, k))
        v = self.a + self.b * k + self.c * k * k
        if v <= 0.0 or v != v:  # NaN guard
            return self.fallback_iv
        return v


def _solve_3x3(a, b):
    """Solve a 3x3 linear system a·x = b via Cramer's rule. Returns None if singular."""

    def det3(m):
        return (
            m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
            - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
            + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
        )

    d = det3(a)
    if abs(d) < 1e-18:
        return None
    x = []
    for col in range(3):
        m = [row[:] for row in a]
        for row in range(3):
            m[row][col] = b[row]
        x.append(det3(m) / d)
    return x


def _weighted_quadratic_fit(points: list[SmilePoint]):
    """Return (a, b, c) minimising sum w_i (iv_i - a - b k_i - c k_i^2)^2."""
    s = [[0.0] * 3 for _ in range(3)]
    rhs = [0.0, 0.0, 0.0]
    for p in points:
        w = p.weight
        k = p.k
        basis = (1.0, k, k * k)
        for i in range(3):
            rhs[i] += w * p.iv * basis[i]
            for j in range(3):
                s[i][j] += w * basis[i] * basis[j]
    return _solve_3x3(s, rhs)


def fit_smile(expiry_ms: int, points: list[SmilePoint], min_points: int = 4) -> Smile | None:
    """Fit a robust quadratic smile. Returns None if there is no usable data.

    With fewer than `min_points` strikes we fall back to a flat smile at the
    median IV (still useful: catches options far below the level).
    """
    pts = [p for p in points if p.iv > 0 and p.weight > 0]
    if not pts:
        return None

    ivs = [p.iv for p in pts]
    median_iv = statistics.median(ivs)

    if len(pts) < min_points:
        return Smile(expiry_ms, median_iv, 0.0, 0.0, len(pts), 0.0, median_iv)

    coeffs = _weighted_quadratic_fit(pts)
    if coeffs is None:
        return Smile(expiry_ms, median_iv, 0.0, 0.0, len(pts), 0.0, median_iv)
    a, b, c = coeffs

    # Robust outlier rejection: drop points > 3 * MAD from the fit, refit once.
    # Only when there is meaningful dispersion — for a near-perfect fit the MAD
    # collapses toward zero and would reject points on floating-point noise.
    residuals = [p.iv - (a + b * p.k + c * p.k * p.k) for p in pts]
    abs_res = [abs(r) for r in residuals]
    mad = statistics.median(abs_res) if abs_res else 0.0
    if mad > 1e-4:
        threshold = 3.0 * 1.4826 * mad  # MAD -> approx std
        kept = [p for p, r in zip(pts, abs_res) if r <= threshold]
        if len(kept) >= min_points and len(kept) < len(pts):
            refit = _weighted_quadratic_fit(kept)
            if refit is not None:
                a, b, c = refit
                pts = kept
                residuals = [p.iv - (a + b * p.k + c * p.k * p.k) for p in pts]

    resid_std = statistics.pstdev(residuals) if len(residuals) > 1 else 0.0
    ks = [p.k for p in pts]
    return Smile(expiry_ms, a, b, c, len(pts), resid_std, median_iv, min(ks), max(ks))
