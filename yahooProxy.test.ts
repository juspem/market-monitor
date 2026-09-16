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

it("normalizes Yahoo request headers and preserves the chart URL and query", async () => {
  const upstream = createHttpServer((request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ url: request.url, headers: request.headers }));
  });
  const upstreamUrl = await listen(upstream);
  const proxy = config.server!.proxy!["/api/yahoo"] as ProxyOptions;
  const vite = await createServer({
    configFile: false,
    server: {
      middlewareMode: true,
      watch: null,
      proxy: { "/api/yahoo": { ...proxy, target: upstreamUrl } },
    },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  cleanup.push(() => vite.close());
  const app = createHttpServer(vite.middlewares);
  const appUrl = await listen(app);

  const response = await fetch(`${appUrl}/api/yahoo/chart/%5EGSPC?interval=1d&period1=0`, {
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
  expect(received.url).toBe("/v8/finance/chart/%5EGSPC?interval=1d&period1=0");
  expect(received.headers["user-agent"]).toBe("market-monitor/0.1.0");
  expect(received.headers.accept).toBe("application/json");
  expect(received.headers.host).toBe(new URL(upstreamUrl).host);
  for (const header of ["cookie", "authorization", "origin", "referer"]) {
    expect(received.headers[header]).toBeUndefined();
  }
});
