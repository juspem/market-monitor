# Data sources and release status

Reviewed 2026-09-16. This is an engineering record of the sources checked and unresolved questions, not a legal opinion or permission from a provider.

## Release status

The software license and successful data downloads do not establish permission for automated access, display, redistribution, derived indicators, or commercial use. No written Yahoo or Cboe permission is recorded in this repository. Resolve the applicable terms with the providers, or use a data service licensed for the intended distribution, before promoting a public live-data release. Keep contracts, account details, and permission correspondence outside the public repository.

## Yahoo Finance

The app automatically requests daily history through Yahoo's chart endpoint. This implementation does not establish an authorized public API entitlement. Yahoo's [Canadian terms](https://legal.yahoo.com/ca/en/yahoo/terms/otos/index.html), section 2, restrict automated access/collection without prior permission and impose other content-use limits. The current [US terms](https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html) and [European terms](https://legal.yahoo.com/ie/en/yahoo/terms/otos/index.html) could not be retrieved by the audit browser; the Canadian text is evidence of a concern, not a conclusion about which regional contract applies to every user. Verify the applicable regional and Finance-specific terms and any underlying exchange/data-vendor restrictions. Attribution or a free download does not resolve this.

## Cboe

VIX and VIX3M are downloaded from Cboe's daily closing-history CSVs. Cboe's [website terms](https://www.cboe.com/terms/), section 2, describe limited personal, non-commercial use and restrict other uses without prior written consent, subject to stated exceptions. The publicly accessible CSV files are not evidence of an unrestricted data license. Confirm permission covering automated downloads and display/derived ratios in the intended app. Source: [Cboe historical data](https://www.cboe.com/tradable-products/vix/vix-historical-data).

## Federal Reserve data via FRED

[DGS2](https://fred.stlouisfed.org/series/DGS2) and [DGS10](https://fred.stlouisfed.org/series/DGS10) identify the Board of Governors of the Federal Reserve System (US), H.15 Selected Interest Rates, as the source. Both series are tagged Public Domain: Citation Requested. Attribute the Board as the source and FRED, Federal Reserve Bank of St. Louis, as the retrieval service. Public-domain source data and rights to access a service are distinct; [FRED service terms](https://fred.stlouisfed.org/legal/) still apply. The app currently uses the public graph CSV endpoint, not the authenticated FRED API. Confirm that access method for the intended distribution; API migration would have separate terms and credential handling.

## Boundaries

- The installer contains application assets, not a bulk copy of the providers' market histories. Source tests contain small fixtures.
- Desktop requests go from each user's device to the providers. That design does not override provider terms.
- Company, index, and provider names identify sources; no sponsorship or affiliation is claimed.
- The dashboard is informational software. Data can be delayed, incomplete, or incorrect and should not be treated as a recommendation to trade.
