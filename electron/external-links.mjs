// Keep chart attribution functional without allowing arbitrary OS protocol handlers.
export function isAllowedExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && ["www.tradingview.com", "tradingview.com"].includes(url.hostname);
  } catch { return false; }
}
