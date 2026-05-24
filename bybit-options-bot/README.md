# Bybit cheap-options bot

A fast scanner + delta-neutral trader for **anomalously cheap crypto options**
on Bybit (USDC options: BTC, ETH, SOL).

It continuously pulls the option chain, fits a fair implied-vol smile per
expiry, and flags options whose **ask is trading well below fair value**. For
the strongest signals it builds a **beta-neutral** trade — buy the cheap option
and hedge its delta with the linear perpetual — so the residual position is
*long cheap volatility*, not a directional bet on price.

> ⚠️ **This bot can place real orders with real money.** It ships **dry-run by
> default** and will not send a single order until you explicitly enable live
> trading *and* provide API keys. Read the [Safety model](#safety-model) before
> going live. Trade at your own risk; options can expire worthless.

---

## The edge it looks for

1. **`ARBITRAGE`** — the ask (plus fees) is below the option's discounted
   intrinsic value. Essentially free money. Highest priority, rare.
2. **`CHEAP_VOL`** — the implied vol of the *ask* sits well below the fitted
   smile for that expiry. You buy cheap vol and delta-hedge it. The trade wins
   if the option re-prices toward fair, or if realised volatility beats the
   cheap implied you paid — independent of market direction.

Every candidate must also clear liquidity, bid/ask-spread, time-to-expiry and
delta filters, so the bot never chases a stale or untradeable quote.

## Why "beta-neutral"?

When you buy a call you're long delta (≈ long the underlying / positive beta);
a put is short delta. The bot sizes a perpetual hedge equal and opposite to the
option's delta, driving net delta to ≈ 0. What's left is a position that's
**long gamma/vega bought below fair value** — the directional ("beta")
exposure is hedged away, isolating the mispricing.

## Architecture

```
bot/
├── pricing.py      Black-76 price, greeks, implied-vol solver (pure Python)
├── surface.py      Robust per-expiry IV smile fit (weighted quadratic)
├── scanner.py      Anomaly detection -> ranked Signals
├── strategy.py     Position sizing + delta hedge -> TradePlan
├── risk.py         Hard limits, daily-loss + kill-switch gate (fail-closed)
├── bybit_client.py Signed Bybit V5 REST client (market data + orders)
├── market.py       Parse Bybit payloads -> typed quotes/specs
├── execution.py    The ONLY place that sends orders (dry-run by default)
├── notify.py       Console + JSONL log + optional Telegram push
├── state.py        Persist risk budget + signal de-dup across restarts
├── demo.py         Synthetic chain for offline end-to-end testing
└── main.py         Orchestration loop + CLI
```

## Install

```bash
cd bybit-options-bot
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Quick start

```bash
# 1. Verify the whole pipeline offline (no network, no funds, synthetic chain):
python run.py --demo

# 2. Live market data, scan + alert only — never trades:
python run.py --no-exec

# 3. Single scan cycle then exit:
python run.py --once
```

`--demo` is the recommended first run: it pushes a hand-built chain with planted
anomalies through scanner → strategy → risk → executor so you can see exactly
what a fired signal and its hedge look like.

## Configuration

Strategy/risk knobs live in [`config.yaml`](config.yaml). **Secrets and the live
gate are environment variables only** (never committed). Copy `.env.example`:

```bash
cp .env.example .env   # fill in keys, then:  set -a; source .env; set +a
```

| Env var              | Meaning                                                        |
| -------------------- | -------------------------------------------------------------- |
| `BYBIT_API_KEY/SECRET` | API credentials (need Options + Derivatives trade permission) |
| `BYBIT_LIVE`         | `true` to allow real orders. Default `false` = dry-run.        |
| `BYBIT_MAINNET`      | `true` for mainnet. Default `false` = **testnet**.             |
| `TELEGRAM_ENABLED`   | `true` to push alerts/fills to Telegram.                       |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Telegram bot creds.                       |

Key risk limits in `config.yaml` (all fail-closed):

- `max_premium_per_trade`, `max_total_premium` — USDC spend caps
- `max_open_positions`, `max_positions_per_underlying`
- `max_daily_loss` — realised loss that halts trading for the day
- `kill_switch_file` — create this file (`.KILL`) to **instantly stop trading**

## Going live — checklist

1. ✅ Run `--demo`, confirm signals and hedges look sane.
2. ✅ Run `--no-exec` against live data for a while; review `logs/signals.jsonl`.
3. ✅ Set `BYBIT_MAINNET=false` and trade on **testnet** first
   (`BYBIT_LIVE=true`, testnet keys) — exercises real order placement, fake money.
4. ✅ Start tiny: low `max_premium_per_trade`, low `max_total_premium`.
5. ✅ Only then set `BYBIT_MAINNET=true`. Keep the `.KILL` switch handy.

The bot **forces dry-run** if `BYBIT_LIVE=true` but credentials are missing, and
the risk gate blocks every trade while `.KILL` exists or the daily loss limit is
hit.

## Run it 24/7

```bash
nohup python run.py > bot.out 2>&1 &     # simple
# or run under systemd / pm2 / a container with the env vars set.
```

## Tests

```bash
python -m unittest discover -t . -s tests -p "test_*.py" -v
```

Covers pricing (parity, IV round-trip, numerical-vega check), smile fitting,
anomaly detection (incl. arbitrage + filter rejection), sizing/hedge direction,
and every risk limit.

## Notes & limitations

- **Geo-blocking:** `api.bybit.com` is blocked in some regions (incl. the US and
  some cloud hosts). Run the bot from a permitted region/VPS. `--demo` works
  anywhere.
- Greeks come from Bybit's ticker when present, falling back to the internal
  Black-76 model. The delta hedge uses the linear USDT perp (configurable via
  `perp_map`); the small USDC/USDT basis is ignored.
- This is an execution/scanning framework, not financial advice. Validate the
  edge on testnet and paper logs before risking capital.
```
