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

## Structure

- `src/domain`: symbols, data types, and ratio definitions
- `src/data`: Yahoo Finance and mock providers
- `src/calculations`: normalization and ratio calculations
- `src/features/dashboard`: dashboard, charts, and panels

## Notes

This is a lightweight tool for personal use. Data may be delayed, and Yahoo Finance may rate-limit requests. Tests use mock data and do not call the live API.