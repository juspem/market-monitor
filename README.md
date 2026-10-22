# Market Analysis

A lightweight market dashboard for Windows and the browser. It shows key indexes, relative ratios, and normalized performance in a compact view.

## License and release status

Copyright (c) 2026 Juuso Manninen. The project's own code is licensed under the [MIT License](LICENSE). MIT permits modification, redistribution, and commercial reuse with the required notices. Third-party code and fonts retain their own licenses; see [Third-party notices](THIRD_PARTY_NOTICES.md).

**Public live-data distribution is not cleared by this repository audit.** The Windows build has passed technical checks, but Yahoo/Cboe access and data-use permissions still need resolution for the intended distribution. A free download and an MIT software license do not grant market-data rights. See [Data sources and unresolved permissions](docs/DATA_SOURCES.md), [Privacy](PRIVACY.md), and [Release review](docs/RELEASE_REVIEW.md).

## Windows app

The build produces `release/Market-Monitor-Setup-<version>-x64.exe`. After resolving the data-use questions above, distribute that installer. Recipients run it, then open **Market Monitor** from the desktop or Start menu. The app supports 64-bit Windows 10 and later. It includes its own runtime, interface, fonts, and data-request handling; users do not need Node.js, a terminal, or a hosted server. Fresh market data requires internet access.

The first release is unsigned, so Windows may show an unfamiliar-publisher warning. Updates are manual: build a new version and distribute its installer. Uninstall through Windows Settings > Apps. The installer runs per user and does not require administrator access.

### Run and package from source

Use Node.js 22.12+ (Node 24 recommended) on Windows:

```powershell
npm.cmd ci
npm.cmd run desktop
```

Create the shareable installer:

```powershell
npm.cmd run desktop:dist
```

This creates `release/Market-Monitor-Setup-<version>-x64.exe`. `npm.cmd run desktop:pack` builds only the unpacked app in `release/win-unpacked/`; that directory must remain intact when running its executable. The first build downloads the Electron runtime and Windows installer tools. Binaries and generated icons are ignored by Git. Increment `version` in `package.json` before distributing an update.

### Desktop verification

```powershell
npm.cmd test
npm.cmd run test:desktop -- --packaged
npm.cmd run test:desktop -- --packaged --live
```

Build the installer or unpacked app first. Desktop checks launch a hidden window with a separate profile, verify charts using test data, and save screenshots/reports under `.desktop-test/`. `--live` additionally verifies all three upstream providers and needs internet access. Without `--packaged`, checks use the development Electron runtime and the latest `dist/` build.

### Desktop data handling

Electron serves bundled assets and a restricted set of data routes at `app://market-monitor`. There is no listening local HTTP server. The renderer runs sandboxed without Node.js access; market requests use fixed HTTPS provider destinations and do not forward local credentials. Desktop builds use the default `/api/...` routes; leave the web-only `VITE_*_DATA_URL` overrides unset when packaging.

Fonts and third-party license notices are bundled with the app. The existing Vite web workflow remains available below.

## Publishing on GitHub

Commit source, package-lock.json, LICENSE, documentation, and build scripts. Dependencies, builds, installers, desktop test profiles, `.env` files, signing keys, and local registry credentials are ignored. A private repository is suitable for backup while release questions remain open. If you publish the source, retain the data-rights status above; MIT covers the code, not provider data.

Before pushing, inspect `git status --short`, `git diff --cached --stat`, and `git diff --cached --check`. `.gitignore` does not remove previously committed files or secrets from history. Keep provider agreements and any credentials outside the public repository. When ready for binary distribution, attach the installer to a GitHub Release instead of committing it to Git. Do not publish the older 0.1.0 installer as the audited release; rebuild the current version so it includes the license and notice corrections.

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

Proxy `/api/cboe/daily_prices/:filename` to `https://cdn-api.cboe.com/api/global/us_indices/daily_prices/:filename`, stripping local cookies and authorization headers. The app requests `VIX_History.csv` and `VIX3M_History.csv`. Development and preview include this proxy. Set `VITE_CBOE_DATA_URL` to an alternative proxy's daily-prices base URL if needed. These are daily closing histories, not intraday quotes.

If Yahoo returns 429, loading stops until you select Retry after the displayed cooldown (at least 60 seconds, longer when Yahoo sends Retry-After). This does not guarantee Yahoo will accept the next request; the upstream restriction can last longer. Restart the development server after changing proxy settings.

## Structure

- `src/domain`: symbols, data types, and ratio definitions
- `src/data`: Yahoo Finance and mock providers
- `src/calculations`: normalization and ratio calculations
- `src/features/dashboard`: dashboard, charts, and panels
- `electron`: Windows app entry point and internal asset/data request handler
- `scripts`: desktop build resources, launcher, and smoke test
- `electron-builder.yml`: Windows installer configuration

## Notes

This is a lightweight tool for personal use. Data may be delayed, and Yahoo Finance may rate-limit requests.
