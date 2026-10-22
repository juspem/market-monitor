import { readFile } from "node:fs/promises";
import path from "node:path";

export const APP_ORIGIN = "app://market-monitor";
export const CONTENT_SECURITY_POLICY = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff",
};

// Only fixed market-data endpoints are exposed. Renderer headers and arbitrary destinations are never forwarded.
export function resolveMarketRequest(url) {
  const yahoo = /^\/api\/yahoo\/chart\/([^/]+)$/.exec(url.pathname);
  if (yahoo) {
    const symbol = decodeURIComponent(yahoo[1]);
    if (!/^[A-Za-z0-9^=.-]{1,24}$/.test(symbol)) throw new Error("Invalid market symbol");
    const upstream = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
    for (const key of ["period1", "period2"]) {
      const value = url.searchParams.get(key);
      if (!value || !/^-?\d{1,12}$/.test(value)) throw new Error("Invalid history period");
      upstream.searchParams.set(key, value);
    }
    upstream.searchParams.set("interval", "1d");
    upstream.searchParams.set("events", "div,splits");
    upstream.searchParams.set("includeAdjustedClose", "true");
    return { url: upstream.href, contentType: "application/json" };
  }
  if (url.pathname === "/api/fred/graph/fredgraph.csv") {
    const id = url.searchParams.get("id");
    if (id !== "DGS2" && id !== "DGS10") throw new Error("Invalid Treasury series");
    const upstream = new URL("https://fred.stlouisfed.org/graph/fredgraph.csv");
    upstream.searchParams.set("id", id);
    for (const key of ["cosd", "coed"]) {
      const value = url.searchParams.get(key);
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error("Invalid history date");
      upstream.searchParams.set(key, value);
    }
    return { url: upstream.href, contentType: "text/csv; charset=utf-8" };
  }
  const cboe = /^\/api\/cboe\/daily_prices\/(VIX|VIX3M)_History\.csv$/.exec(url.pathname);
  if (cboe) return {
    url: `https://cdn-api.cboe.com/api/global/us_indices/daily_prices/${cboe[1]}_History.csv`,
    contentType: "text/csv; charset=utf-8",
  };
  return null;
}

function headers(contentType) {
  return { "Content-Type": contentType, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": CONTENT_SECURITY_POLICY };
}

export function createAppHandler({ distDir, fetcher }) {
  return async (request) => {
    const url = new URL(request.url);
    if (url.protocol !== "app:" || url.host !== "market-monitor" || url.username || url.password) {
      return new Response("Forbidden", { status: 403 });
    }
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } });

    if (url.pathname.startsWith("/api/")) {
      let target;
      try { target = resolveMarketRequest(url); }
      catch { return new Response("Invalid data request", { status: 400 }); }
      if (!target) return new Response("Unknown data route", { status: 404 });
      try {
        const upstream = await fetcher(target.url, {
          method: "GET", credentials: "omit", redirect: "error",
          headers: { "User-Agent": "market-monitor/0.1.0", Accept: target.contentType },
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]),
        });
        const responseHeaders = headers(target.contentType);
        responseHeaders["Cache-Control"] = "no-store";
        const retryAfter = upstream.headers.get("Retry-After");
        if (retryAfter) responseHeaders["Retry-After"] = retryAfter;
        // Buffer the response so a timeout covers the body as well as the initial connection.
        const body = await upstream.arrayBuffer();
        return new Response([204, 205, 304].includes(upstream.status) ? null : body, { status: upstream.status, headers: responseHeaders });
      } catch (error) {
        return new Response(error?.name === "TimeoutError" ? "Market data request timed out" : "Market data is unreachable. Check your internet connection.",
          { status: error?.name === "TimeoutError" ? 504 : 502, headers: headers("text/plain; charset=utf-8") });
      }
    }

    let pathname;
    try { pathname = decodeURIComponent(url.pathname); }
    catch { return new Response("Invalid path", { status: 400 }); }
    if (pathname === "/") pathname = "/index.html";
    // Serve only the built entry page, icon, and flat Vite asset directory, never source or system files.
    if (!/^\/(?:index\.html|market-monitor\.svg|assets\/[a-zA-Z0-9_-][a-zA-Z0-9._-]*)$/.test(pathname)) {
      return new Response("Not found", { status: 404 });
    }
    const contentType = MIME_TYPES[path.extname(pathname)];
    if (!contentType) return new Response("Not found", { status: 404 });
    try {
      return new Response(await readFile(path.join(distDir, pathname.slice(1))), { headers: headers(contentType) });
    } catch {
      return new Response("Application asset not found", { status: 404 });
    }
  };
}
