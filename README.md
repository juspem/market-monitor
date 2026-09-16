# Market Analysis

A lightweight market dashboard for the browser. It shows key indexes, relative ratios, and normalized performance in a compact view.

## What it does

- shows key indexes and market leadership
- compares ratios such as S&P 500 Equal Weight / S&P 500
- shows normalized performance over the selected range
- fetches data from Yahoo Finance and uses a mock provider for tests

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

The app fetches daily data from Yahoo Finance. The selected instruments are mainly official indexes and key risk and asset-class ETFs. Data is normalized and compared by trading date so time zones do not distort the comparisons.

Both development and `npm run preview` send requests through `/api/yahoo/chart`. The proxy sets a consistent application User-Agent because Yahoo can reject requests immediately with HTTP 429 based on client headers. It also keeps local cookies and authorization headers from being forwarded to Yahoo.

When deploying the built files, configure a server-side proxy for `/api/yahoo/chart/:symbol` to `https://query1.finance.yahoo.com/v8/finance/chart/:symbol`, preserving query parameters and using the headers configured in `vite.config.ts`. Alternatively, set `VITE_MARKET_DATA_URL` at build time to your own chart proxy. A static file host alone does not provide this route, and direct browser requests to Yahoo are not supported by its CORS response headers.

If Yahoo returns 429, loading stops until you select Retry after the displayed cooldown (at least 60 seconds, longer when Yahoo sends Retry-After). This does not guarantee Yahoo will accept the next request; the upstream restriction can last longer. Restart the development server after changing proxy settings.

## Structure

- `src/domain`: symbols, data types, and ratio definitions
- `src/data`: Yahoo Finance and mock providers
- `src/calculations`: normalization and ratio calculations
- `src/features/dashboard`: dashboard, charts, and panels

## Notes

This is a lightweight tool for personal use. Data may be delayed, and Yahoo Finance may rate-limit requests.
