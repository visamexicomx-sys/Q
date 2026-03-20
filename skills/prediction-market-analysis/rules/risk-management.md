# Risk Management

## Position Sizing

### Kelly Criterion (Simplified)
```
Optimal fraction = (edge / odds)
f = (p * b - q) / b

Where:
  p = your estimated probability
  q = 1 - p
  b = payout odds (1/price - 1)
```

Use half-Kelly or quarter-Kelly for safety — full Kelly is too aggressive in practice.

### Maximum Position Rules
- Never risk more than 5% of portfolio on a single market
- Never risk more than 15% on correlated markets
- Keep at least 30% of portfolio in cash for new opportunities

## Stop-Loss Strategies

Prediction markets don't have traditional stop-losses. Instead:

1. **Price-based exit**: If market moves against you by >15 cents, reassess thesis
2. **Time-based exit**: If resolution is approaching and thesis hasn't played out, reduce
3. **News-based exit**: If material new information invalidates your thesis, exit immediately

## Portfolio Management

### Diversification
- Spread across uncorrelated markets (politics, sports, crypto, weather)
- Spread across platforms to reduce counterparty risk
- Spread across time horizons (short-term + long-term)

### Tracking
Use these MCP tools regularly:
- `get_balance` — Monitor available capital
- `get_positions` — Review all open positions
- `get_fills` — Track recent executions and P&L
- `get_orders` — Check pending orders, cancel stale ones

### P&L Calculation
```
Profit per contract = Exit price − Entry price (for YES buys)
Total P&L = Contracts × (Exit − Entry) − Fees

For resolved markets:
  Won: Payout ($1) − Entry price − Fees
  Lost: −Entry price − Fees
```

## Common Mistakes to Avoid

1. **Overconcentration**: Too much capital in one market or correlated markets
2. **Ignoring fees**: Kalshi takes ~7% of profits; Polymarket ~2% per trade
3. **Illiquid markets**: Wide spreads eat into edge; hard to exit
4. **Anchoring**: Don't hold losing positions just because you "should" be right
5. **Overtrading**: Each trade has costs; only trade with genuine edge
