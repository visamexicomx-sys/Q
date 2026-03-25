---
name: polymarket-trading-bot
description: A complete Polymarket prediction market trading bot with multiple strategies (value, momentum, market making, arbitrage), risk management, market scanning, and paper trading support. Use when the user wants to trade on Polymarket, build a trading bot, or analyze prediction markets.
---

# Polymarket Trading Bot

A production-ready trading bot for Polymarket prediction markets with multiple strategies, risk management, and paper trading.

## Features

- **4 Built-in Strategies**: Value, Momentum, Market Making, Arbitrage
- **Risk Management**: Position limits, exposure caps, daily loss limits, cooldowns
- **Market Scanner**: Automatic discovery and ranking of trading opportunities
- **Paper Trading**: Full simulation mode (DRY_RUN=true) — no real money needed
- **CLOB API Integration**: Direct integration with Polymarket's order book
- **Kelly Criterion Sizing**: Mathematically optimal position sizing

## Quick Start

```bash
cd polymarket-bot
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings (DRY_RUN=true by default)
python bot.py --scan      # Preview markets
python bot.py --once      # Run one trading cycle
python bot.py             # Continuous trading loop
```

## Strategies

| Strategy    | Description                                      | Best For                    |
| ----------- | ------------------------------------------------ | --------------------------- |
| Value       | Trade mispricings vs estimated fair value         | Markets with clear edge     |
| Momentum    | Follow recent price trends                        | Trending/high-volume markets|
| Market Maker| Provide liquidity, profit from spread             | Stable, liquid markets      |
| Arbitrage   | Exploit YES+NO price discrepancies                | Mispriced binary markets    |

## Configuration

All config via `.env` file:

| Variable                  | Default | Description                        |
| ------------------------- | ------- | ---------------------------------- |
| `DRY_RUN`                 | true    | Paper trading mode                 |
| `MAX_POSITION_SIZE_USDC`  | 100     | Max per-market position            |
| `MAX_TOTAL_EXPOSURE_USDC` | 500     | Total portfolio exposure cap       |
| `MIN_EDGE_THRESHOLD`      | 0.05    | Minimum edge to trade              |
| `ORDER_SIZE_USDC`         | 10      | Default order size                 |
