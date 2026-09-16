# Market Analysis

A lightweight market dashboard for the browser. It shows key indexes, relative ratios, and normalized performance in a compact view.

## What it does

- shows key indexes and market leadership
- compares ratios such as S&P 500 Equal Weight / S&P 500
- shows normalized performance over the selected range
- tracks EUR/USD, USD/JPY, and GBP/USD with native quotes and explicit currency direction
- shows US 2-year and 10-year Treasury yields, their spread in basis points, and VIX/VIX3M
- fetches data from Yahoo Finance, FRED, and Cboe and uses a mock provider for tests

## Usage

### Install

```powershell
npm install
```

### Development

```powershell
npm run dev
```

Or use the fixed local start command:

```powershell
npm start
```

### Tests

```powershell
npm test
```

### Build

```powershell
npm run build
```

## Data

The app fetches daily index, ETF, and FX data from Yahoo Finance. VIX and VIX3M closing histories come from Cboe's daily CSV files: Yahoo can return only a single VIX3M quote even when a historical range is requested. The volatility ratio matches Cboe closing observations by date. Ratio panels show their source, observation count, and date coverage; a single observation is displayed as a dated reading with an insufficient-history message instead of a trend chart.

Treasury constant-maturity yields come from the Federal Reserve H.15 series DGS2 and DGS10 via FRED's public CSV export (no API key). Yields remain percentages; yield changes and the 10Y minus 2Y spread use basis points. The spread uses only dates available in both series, with no forward filling. Currency quotes use four decimals (three for USD/JPY). New indicator panels and ratio charts follow the selected range; ranges count observations.

Find currency panels under **Global & currency** and Treasury panels under **Risk & rates**. VIX/VIX3M replaces VIX/S&P 500 and marks 1 as the equal-volatility reference. Each native indicator shows its source and observation date. Data-source failures produce a partial-data notice with a Retry button while successful series remain visible.

Both development and `npm run preview` send requests through `/api/yahoo/chart`. The proxy sets a consistent application User-Agent because Yahoo can reject requests immediately with HTTP 429 based on client headers. It also keeps local cookies and authorization headers from being forwarded to Yahoo.

When deploying the built files, configure a server-side proxy for `/api/yahoo/chart/:symbol` to `https://query1.finance.yahoo.com/v8/finance/chart/:symbol`, preserving query parameters and using the headers configured in `vite.config.ts`. Alternatively, set `VITE_MARKET_DATA_URL` at build time to your own chart proxy. A static file host alone does not provide this route, and direct browser requests to Yahoo are not supported by its CORS response headers.

Also proxy `/api/fred/graph/fredgraph.csv` to `https://fred.stlouisfed.org/graph/fredgraph.csv`, preserving query parameters and stripping local cookies and authorization headers. Development and preview use the proxy in `vite.config.ts`; restart the server after changing it. Set `VITE_FRED_DATA_URL` at build time to use your own CSV proxy. Source series: [2-year yield](https://fred.stlouisfed.org/series/DGS2), [10-year yield](https://fred.stlouisfed.org/series/DGS10). FRED observations can lag the latest market session.

Proxy `/api/cboe/daily_prices/:filename` to `https://cdn.cboe.com/api/global/us_indices/daily_prices/:filename`, stripping local cookies and authorization headers. The app requests `VIX_History.csv` and `VIX3M_History.csv`. Development and preview include this proxy. Set `VITE_CBOE_DATA_URL` to an alternative proxy's daily-prices base URL if needed. These are daily closing histories, not intraday quotes.

If Yahoo returns 429, loading stops until you select Retry after the displayed cooldown (at least 60 seconds, longer when Yahoo sends Retry-After). This does not guarantee Yahoo will accept the next request; the upstream restriction can last longer. Restart the development server after changing proxy settings.

## Structure

- `src/domain`: symbols, data types, and ratio definitions
- `src/data`: Yahoo Finance and mock providers
- `src/calculations`: normalization and ratio calculations
- `src/features/dashboard`: dashboard, charts, and panels

## Notes

This is a lightweight tool for personal use. Data may be delayed, and Yahoo Finance may rate-limit requests.
