# Prediction Market Analysis

## Edge Detection

Edge = Your estimated probability − Market price

- Positive edge → the market underprices the outcome → buy YES
- Negative edge → the market overprices the outcome → buy NO (or sell YES)
- Only trade when edge > spread + fees (typically > 3-5%)

## Orderbook Analysis

Use `get_orderbook` to assess:

1. **Spread**: Difference between best bid and best ask. Tight spread = liquid market
2. **Depth**: Total volume at each price level. Deep books = easier to enter/exit
3. **Imbalance**: More bids than asks = buying pressure (price likely to rise)
4. **Wall detection**: Large orders at specific levels indicate support/resistance

## Price History Analysis

Use `get_price_history` to identify:

1. **Trend**: Is probability rising or falling over time?
2. **Volatility**: How much does the price swing? High vol = more trading opportunity
3. **Support/Resistance**: Price levels where the market repeatedly bounces
4. **Volume profile**: When are most trades happening? Spikes indicate news events

## Cross-Platform Arbitrage

Compare the same event across platforms:

```
Platform A: YES = 0.60, NO = 0.42  (spread: 0.02)
Platform B: YES = 0.55, NO = 0.47  (spread: 0.02)

Arbitrage: Buy YES on B (0.55) + Buy NO on A (0.42) = 0.97
Guaranteed profit: $0.03 per contract pair (minus fees)
```

Requirements for arbitrage:
- Same underlying event and resolution criteria
- Account funded on both platforms
- Factor in fees (Kalshi ~7% on profit, Polymarket ~2% on trades)
- Consider settlement timing differences

## News-Driven Analysis

Prediction markets react to news. Key patterns:
- **Overreaction**: Markets spike on headlines, then revert. Fade extreme moves
- **Underreaction**: Complex news takes time to be priced in. Early analysis = edge
- **Correlation**: Related markets move together. If one hasn't moved yet, opportunity exists

## Market Efficiency Indicators

- **Volume**: Higher daily volume = more efficient pricing
- **Number of traders**: More participants = harder to find edge
- **Time to resolution**: Markets further from resolution are less efficient
- **Complexity**: Multi-outcome or conditional markets tend to be less efficient
