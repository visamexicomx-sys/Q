# Trading Workflow

## MCP Server Setup

The polyrouter-mcp server must be running for trading tools to be available:

```bash
cd polyrouter-mcp
bun run start        # Production (built)
bun run dev          # Development
```

## Available Tools (65+)

### Market Discovery
- `search_markets(q, platform?)` — Cross-platform market search
- `list_markets(platform?, limit?, offset?)` — Browse all markets
- `get_market(market_id, platform)` — Full market details
- `list_events` / `get_event` — Event-level data

### Market Data
- `get_orderbook(market_id, platform)` — Real-time bid/ask depth
- `get_price_history(market_id, platform, interval?)` — OHLC candlestick data
- `get_trades(market_id, platform, limit?)` — Recent trade history

### Trading (Two-Step Flow)
1. `preview_order(platform, market_id, side, outcome, size, price?, order_type?)` — Get cost estimate + preview_id (valid 60s)
2. `confirm_order(preview_id)` — Execute the previewed order

Parameters:
- `side`: "buy" or "sell"
- `outcome`: "yes" or "no"
- `order_type`: "limit" (default) or "market"
- `price`: Required for limit orders (0-1 decimal)
- `size`: Number of contracts

### Order Management
- `get_orders(platform, status?)` — List open/all orders
- `cancel_order(platform, order_id)` — Cancel specific order
- `cancel_all_orders(platform, market_id?)` — Cancel all open orders
- `amend_order(platform, order_id, price?, size?)` — Modify order (Kalshi only)

### Portfolio
- `get_balance(platform)` — Available/reserved/total balance
- `get_positions(platform)` — Current market positions
- `get_fills(platform, market_id?)` — Trade execution history

## Workflow Examples

### Finding and Analyzing a Market
```
1. search_markets(q="election", platform="kalshi")
2. get_market(market_id="KXELECTION-123", platform="kalshi")
3. get_orderbook(market_id="KXELECTION-123", platform="kalshi")
4. get_price_history(market_id="KXELECTION-123", platform="kalshi")
```

### Placing a Trade
```
1. preview_order(platform="kalshi", market_id="KXELECTION-123", side="buy", outcome="yes", size="10", price="0.45", order_type="limit")
   → Returns preview_id with cost breakdown
2. confirm_order(preview_id="abc123")
   → Order placed
3. get_orders(platform="kalshi", status="open")
   → Verify order is in the book
```

### Cross-Platform Comparison
```
1. search_markets(q="bitcoin 100k") — returns results from all platforms
2. Compare prices across Kalshi vs Polymarket for the same event
3. If YES_kalshi + NO_polymarket < 1.00, arbitrage opportunity exists
```

## Platform-Specific Notes

### Kalshi
- Market IDs look like: `KXGREENLAND-29`
- Supports order amendments
- Balance in USD
- RSA key authentication

### Polymarket
- Market IDs are numeric token IDs
- Requires Ethereum wallet + Polygon network
- Balance in USDC
- Must approve wallet on polymarket.com before first trade
