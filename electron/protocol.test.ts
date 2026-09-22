import { afterAll, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createAppHandler, resolveMarketRequest } from "./protocol.mjs";

const testRoot = path.resolve(".desktop-test");
await mkdir(testRoot, { recursive: true });
const distDir = await mkdtemp(path.join(testRoot, "protocol-"));
await writeFile(path.join(distDir, "index.html"), "<h1>Market Monitor</h1>");
afterAll(async () => {
  if (!path.resolve(distDir).startsWith(testRoot + path.sep)) throw new Error("Unsafe fixture cleanup");
  await rm(distDir, { recursive: true, force: true });
});

describe("desktop data routes", () => {
  it.each([
    ["/api/yahoo/chart/%5EGSPC?period1=0&period2=1800000000&interval=1m&url=https://evil.test", "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?period1=0&period2=1800000000&interval=1d&events=div%2Csplits&includeAdjustedClose=true"],
    ["/api/fred/graph/fredgraph.csv?id=DGS2&cosd=2026-01-01&coed=2026-09-16", "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS2&cosd=2026-01-01&coed=2026-09-16"],
    ["/api/cboe/daily_prices/VIX3M_History.csv", "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX3M_History.csv"],
  ])("maps only supported upstream parameters for %s", (route, expected) => {
    expect(resolveMarketRequest(new URL(`app://market-monitor${route}`))?.url).toBe(expected);
  });

  it("keeps rate-limit status and Retry-After without forwarding cookies or authorization", async () => {
    const fetcher = vi.fn(async () => new Response("Limited", { status: 429, headers: { "Retry-After": "120", "Set-Cookie": "upstream=private" } }));
    const handler = createAppHandler({ distDir, fetcher });
    const response = await handler(new Request("app://market-monitor/api/yahoo/chart/JPY%3DX?period1=0&period2=1800000000", {
      headers: { Cookie: "local=private", Authorization: "Bearer local", Origin: "app://market-monitor" },
    }));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(response.headers.get("Set-Cookie")).toBeNull();
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: "omit", redirect: "error", headers: { "User-Agent": "market-monitor/0.1.0", Accept: "application/json" } });
    expect(Object.keys(fetcher.mock.calls[0][1].headers)).toEqual(["User-Agent", "Accept"]);
  });

  it.each([
    ["app://evil.test/api/cboe/daily_prices/VIX_History.csv", 403],
    ["app://market-monitor/api/yahoo/chart/%2F..%2Fsecret?period1=0&period2=1", 400],
    ["app://market-monitor/api/fred/graph/fredgraph.csv?id=PRIVATE&cosd=2026-01-01&coed=2026-02-01", 400],
    ["app://market-monitor/api/cboe/daily_prices/unknown.csv", 404],
    ["app://market-monitor/api/yahoo/chart/SPY?period1=invalid&period2=1", 400],
  ])("rejects an invalid request without network access: %s", async (url, status) => {
    const fetcher = vi.fn();
    expect((await createAppHandler({ distDir, fetcher })(new Request(url))).status).toBe(status);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns a useful failure when the network is unavailable", async () => {
    const handler = createAppHandler({ distDir, fetcher: async () => { throw new Error("offline"); } });
    const response = await handler(new Request("app://market-monitor/api/cboe/daily_prices/VIX_History.csv"));
    expect(response.status).toBe(502);
    expect(await response.text()).toContain("internet connection");
  });
});

describe("packaged assets", () => {
  it("serves the bundled entry page with a restrictive script policy", async () => {
    const response = await createAppHandler({ distDir, fetcher: vi.fn() })(new Request("app://market-monitor/"));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Market Monitor");
    expect(response.headers.get("Content-Security-Policy")).toContain("script-src 'self'");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it.each(["/package.json", "/electron/main.mjs", "/assets/%2e%2e%2fpackage.json", "/assets/%5c..%5cpackage.json", "/C%3A/Windows/win.ini"])("does not expose local files through %s", async (pathname) => {
    const response = await createAppHandler({ distDir, fetcher: vi.fn() })(new Request(`app://market-monitor${pathname}`));
    expect(response.status).toBe(404);
  });
});
