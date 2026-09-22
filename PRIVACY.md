# Privacy and network behavior

Last reviewed: 2026-09-16. Maintainer: Juuso Manninen.

This document describes the application as implemented. It does not describe the independent practices of market-data providers or certify compliance with every applicable privacy law.

## Data leaving the device

The Windows app requests selected market symbols, series identifiers, and date ranges directly from Yahoo Finance (`query1.finance.yahoo.com`), FRED (`fred.stlouisfed.org`), and Cboe (`cdn.cboe.com`). These services receive the connection's public IP address and ordinary request metadata. Desktop data requests omit credentials and do not forward local cookies or authorization headers. Provider responses may be subject to the providers' privacy policies.

There are no application accounts, portfolio uploads, advertising integrations, analytics SDKs, or application-configured crash-report uploads. Fonts are bundled locally. Clicking the TradingView attribution link opens the external site in the default browser, where that browser's settings and the site's policies apply. The app does not automatically download application updates.

## Local storage

Electron maintains a local application profile and Chromium caches on the device, normally under the Windows user's AppData directories. There is no application database of personal investment holdings or application-managed persistent market-history store. Uninstalling currently preserves application-profile data; users can remove the relevant Market Monitor profile folders after closing the app if they want to clear remaining local data.

## Web development and hosting

Vite development proxies run on the developer's machine. A separately hosted web deployment would send requests through that host, whose operator may have access to connection metadata and logs. This desktop description alone is insufficient for such a deployment; publish the host's actual retention and contact practices before offering a hosted service.

## Reports and questions

Direct questions to Juuso Manninen using the contact channel provided with the distribution. Do not post credentials, private browsing data, or unredacted local profile files in a public issue. Establish a maintained contact channel before a public release.
