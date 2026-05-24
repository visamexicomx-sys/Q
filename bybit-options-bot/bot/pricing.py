"""Black-76 option pricing, greeks and implied-vol solving.

Crypto options on Bybit are quoted and settled in USDC against a forward /
index (`underlyingPrice`), so we use the Black-76 (forward) model rather than
spot Black-Scholes. Discounting uses a flat rate `r` (default 0 for USDC).

Pure standard library — no numpy/scipy — so this is trivially testable and the
bot has no heavy dependencies.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

SQRT_2 = math.sqrt(2.0)
SQRT_2PI = math.sqrt(2.0 * math.pi)

# Vol search bounds for the implied-vol solver (annualised).
MIN_VOL = 1e-4
MAX_VOL = 5.0  # 500% vol — crypto can be wild, but anything past this is noise.


def _norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / SQRT_2))


def _norm_pdf(x: float) -> float:
    return math.exp(-0.5 * x * x) / SQRT_2PI


def years_to_expiry(expiry_ms: int, now_ms: int) -> float:
    """Time to expiry in years, floored at a tiny positive number."""
    seconds = max(0.0, (expiry_ms - now_ms) / 1000.0)
    return max(seconds / (365.0 * 24.0 * 3600.0), 1e-9)


@dataclass(frozen=True)
class Greeks:
    price: float
    delta: float
    gamma: float
    vega: float  # per 1.00 (100 vol points) change in vol
    theta: float  # per year


def _d1_d2(forward: float, strike: float, vol: float, t: float):
    vt = vol * math.sqrt(t)
    d1 = (math.log(forward / strike) + 0.5 * vol * vol * t) / vt
    d2 = d1 - vt
    return d1, d2


def black76_price(
    forward: float,
    strike: float,
    vol: float,
    t: float,
    is_call: bool,
    r: float = 0.0,
) -> float:
    """Undiscounted-forward Black-76 premium, discounted to today by exp(-r t)."""
    if forward <= 0 or strike <= 0 or t <= 0:
        return 0.0
    df = math.exp(-r * t)
    if vol <= MIN_VOL:
        intrinsic = max(forward - strike, 0.0) if is_call else max(strike - forward, 0.0)
        return df * intrinsic
    d1, d2 = _d1_d2(forward, strike, vol, t)
    if is_call:
        return df * (forward * _norm_cdf(d1) - strike * _norm_cdf(d2))
    return df * (strike * _norm_cdf(-d2) - forward * _norm_cdf(-d1))


def black76_greeks(
    forward: float,
    strike: float,
    vol: float,
    t: float,
    is_call: bool,
    r: float = 0.0,
) -> Greeks:
    """Forward-based greeks. delta/gamma are w.r.t. the forward; vega per 1.00 vol."""
    if forward <= 0 or strike <= 0 or t <= 0 or vol <= MIN_VOL:
        price = black76_price(forward, strike, vol, t, is_call, r)
        intrinsic_delta = 0.0
        if t > 0 and vol <= MIN_VOL:
            if is_call:
                intrinsic_delta = 1.0 if forward > strike else 0.0
            else:
                intrinsic_delta = -1.0 if forward < strike else 0.0
        return Greeks(price=price, delta=intrinsic_delta, gamma=0.0, vega=0.0, theta=0.0)

    df = math.exp(-r * t)
    sqrt_t = math.sqrt(t)
    d1, d2 = _d1_d2(forward, strike, vol, t)
    pdf = _norm_pdf(d1)

    price = black76_price(forward, strike, vol, t, is_call, r)
    delta = df * (_norm_cdf(d1) if is_call else _norm_cdf(d1) - 1.0)
    gamma = df * pdf / (forward * vol * sqrt_t)
    vega = df * forward * pdf * sqrt_t
    # Theta (per year); sign negative for long options (time decay).
    common = -df * forward * pdf * vol / (2.0 * sqrt_t)
    if is_call:
        theta = common + r * df * (forward * _norm_cdf(d1) - strike * _norm_cdf(d2))
    else:
        theta = common - r * df * (strike * _norm_cdf(-d2) - forward * _norm_cdf(-d1))
    return Greeks(price=price, delta=delta, gamma=gamma, vega=vega, theta=theta)


def implied_vol(
    price: float,
    forward: float,
    strike: float,
    t: float,
    is_call: bool,
    r: float = 0.0,
) -> float | None:
    """Solve Black-76 implied vol from a premium. Newton with bisection fallback.

    Returns None if the price is below intrinsic (no real vol) or otherwise
    unsolvable.
    """
    if price <= 0 or forward <= 0 or strike <= 0 or t <= 0:
        return None

    df = math.exp(-r * t)
    intrinsic = df * (max(forward - strike, 0.0) if is_call else max(strike - forward, 0.0))
    # Allow a tiny tolerance below intrinsic for rounding; otherwise unsolvable.
    if price < intrinsic - 1e-9:
        return None
    upper_bound = df * (forward if is_call else strike)
    if price >= upper_bound:
        return MAX_VOL

    vol = 0.5  # starting guess
    for _ in range(60):
        g = black76_greeks(forward, strike, vol, t, is_call, r)
        diff = g.price - price
        if abs(diff) < 1e-8:
            return vol
        if g.vega < 1e-12:
            break
        step = diff / g.vega
        vol -= step
        if vol <= MIN_VOL or vol >= MAX_VOL:
            break

    # Bisection fallback — robust where Newton diverges.
    lo, hi = MIN_VOL, MAX_VOL
    p_lo = black76_price(forward, strike, lo, t, is_call, r)
    p_hi = black76_price(forward, strike, hi, t, is_call, r)
    if (p_lo - price) * (p_hi - price) > 0:
        return None
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        p_mid = black76_price(forward, strike, mid, t, is_call, r)
        if abs(p_mid - price) < 1e-9:
            return mid
        if (p_lo - price) * (p_mid - price) <= 0:
            hi = mid
            p_hi = p_mid
        else:
            lo = mid
            p_lo = p_mid
    return 0.5 * (lo + hi)


def log_moneyness(strike: float, forward: float) -> float:
    """ln(K / F). Negative for OTM puts / ITM calls."""
    return math.log(strike / forward)
