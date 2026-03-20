---
name: prediction-market-analysis
description: Analyze and trade prediction markets using Polyrouter MCP (Polymarket, Kalshi, Limitless, Manifold)
metadata:
  tags: prediction-markets, trading, polymarket, kalshi, analysis, finance
---

## When to use

Use this skill when working with prediction markets — searching markets, analyzing odds, placing trades, managing positions, or building trading strategies across Polymarket, Kalshi, and other platforms.

## Architecture

The trading infrastructure is in `polyrouter-mcp/` — an MCP server providing 65+ tools for market data and trading via the Polyrouter API.

Load [./rules/trading-workflow.md](./rules/trading-workflow.md) for the complete trading workflow and tool reference.

## Quick Start

1. **Search markets**: Use `search_markets` with keywords and optional platform filter
2. **Analyze**: Check `get_orderbook` for liquidity, `get_price_history` for trends, `get_trades` for volume
3. **Trade**: Use `preview_order` → `confirm_order` two-step flow
4. **Monitor**: Use `get_positions`, `get_orders`, `get_fills` to track portfolio

## Analysis Patterns

Load [./rules/analysis.md](./rules/analysis.md) for market analysis techniques including:
- Probability assessment and edge detection
- Orderbook depth analysis
- Price history and momentum
- Cross-platform arbitrage detection

## Risk Management

Load [./rules/risk-management.md](./rules/risk-management.md) for position sizing, portfolio management, and risk controls.

## Platform Reference

- **Kalshi**: US-regulated, event contracts, USD settlement. Credentials: API key + RSA secret
- **Polymarket**: Crypto-native, Polygon network, USDC settlement. Credentials: Ethereum private key
- **Limitless / Manifold**: Read-only market data via Polyrouter API

## Key Concepts

- Prices are decimals 0–1 representing probability (0.37 = 37 cents per contract)
- Each contract pays $1 if the outcome is Yes, $0 if No
- YES price + NO price = $1 (minus spread)
- Edge = your estimated probability − market price
