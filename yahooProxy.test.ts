import { createServer as createHttpServer, type Server } from "node:http";
import { afterEach, expect, it } from "vitest";
import { createServer, type ProxyOptions } from "vite";
import config from "./vite.config";

const cleanup: Array<() => Promise<unknown>> = [];

afterEach(async () => {
  for (const close of cleanup.reverse()) {
    await close();
  }
  cleanup.length = 0;
});

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  cleanup.push(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected a TCP address");
  }
  return `http://127.0.0.1:${address.port}`;
}

it.each([
  { prefix: "/api/yahoo", path: "/api/yahoo/chart/%5EGSPC?interval=1d&period1=0", expected: "/v8/finance/chart/%5EGSPC?interval=1d&period1=0", accept: "application/json" },
  { prefix: "/api/fred", path: "/api/fred/graph/fredgraph.csv?id=DGS2&cosd=2026-01-01", expected: "/graph/fredgraph.csv?id=DGS2&cosd=2026-01-01", accept: "text/csv" },
  { prefix: "/api/cboe", path: "/api/cboe/daily_prices/VIX3M_History.csv", expected: "/api/global/us_indices/daily_prices/VIX3M_History.csv", accept: "text/csv" },
])("normalizes $prefix headers and preserves the upstream URL and query", async ({ prefix, path, expected, accept }) => {
  const upstream = createHttpServer((request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ url: request.url, headers: request.headers }));
  });
  const upstreamUrl = await listen(upstream);
  const proxy = config.server!.proxy![prefix] as ProxyOptions;
  const vite = await createServer({
    configFile: false,
    server: {
      middlewareMode: true,
      watch: null,
      proxy: { [prefix]: { ...proxy, target: upstreamUrl } },
    },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  cleanup.push(() => vite.close());
  const app = createHttpServer(vite.middlewares);
  const appUrl = await listen(app);

  const response = await fetch(`${appUrl}${path}`, {
    headers: {
      "User-Agent": "",
      Cookie: "local-session=test",
      Authorization: "Bearer local-test-token",
      Origin: appUrl,
      Referer: `${appUrl}/`,
    },
  });
  const received = await response.json();

  expect(response.status).toBe(200);
  expect(received.url).toBe(expected);
  expect(received.headers["user-agent"]).toBe("market-monitor/0.1.0");
  expect(received.headers.accept).toBe(accept);
  expect(received.headers.host).toBe(new URL(upstreamUrl).host);
  for (const header of ["cookie", "authorization", "origin", "referer"]) {
    expect(received.headers[header]).toBeUndefined();
  }
});
