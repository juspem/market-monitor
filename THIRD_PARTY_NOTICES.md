# Third-party software

The project's own code is copyright (c) 2026 Juuso Manninen and licensed under MIT. Dependencies retain their respective copyrights and licenses. This does not license provider data or imply provider endorsement.

| Component | License | Where the packaged license is provided |
| --- | --- | --- |
| React, React DOM, React Scheduler | MIT | THIRD-PARTY-NOTICES.txt |
| TradingView Lightweight Charts | Apache-2.0, with upstream attribution notice | THIRD-PARTY-NOTICES.txt and in-app footer |
| Fancy Canvas | MIT | THIRD-PARTY-NOTICES.txt |
| DM Sans and Space Grotesk fonts | SIL Open Font License 1.1 | THIRD-PARTY-NOTICES.txt |
| Electron | MIT | LICENSE.electron.txt |
| Chromium and its bundled components | Multiple licenses | LICENSES.chromium.html |

TradingView Lightweight Charts™

Copyright (с) 2025 TradingView, Inc. https://www.tradingview.com/

The Lightweight Charts notice is copied from the [v5.2.1 upstream NOTICE](https://github.com/tradingview/lightweight-charts/blob/v5.2.1/NOTICE). Its [attribution instructions](https://github.com/tradingview/lightweight-charts/blob/v5.2.1/README.md#license) require the notice and a TradingView link accessible to users. Keep the notice, in-app attribution, and chart logo when modifying or packaging this app. Recheck the notice when upgrading the library.

The build resource script combines the installed frontend and font license files with the vendored notices; the packager also retains Electron and Chromium licenses. Build/test tools are development dependencies and are not included in the app archive. Refer to package-lock.json for exact dependency versions.

For web distribution, deploy the generated `dist/THIRD-PARTY-NOTICES.txt` with the site. For market-data terms, see [Data sources](docs/DATA_SOURCES.md).
