import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import { _electron } from "playwright-core";

const packaged = process.argv.includes("--packaged");
const live = process.argv.includes("--live");
const output = path.resolve(".desktop-test");
await mkdir(output, { recursive: true });
const profile = await mkdtemp(path.join(output, "profile-"));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const desktop = await _electron.launch({
  executablePath: packaged ? path.resolve("release/win-unpacked/Market Monitor.exe") : undefined,
  args: [...(packaged ? [] : ["."]), "--disable-features=AutoDeElevate", "--disable-gpu", "--smoke-test", `--user-data-dir=${profile}`],
  env, timeout: 30_000,
});
const report = { packaged, live, checks: [], data: [] };
try {
  const window = await desktop.firstWindow();
  const errors = [];
  window.on("pageerror", (error) => errors.push(error.message));
  await window.getByRole("heading", { name: "Broad market view" }).waitFor();
  assert.equal(new URL(window.url()).host, "market-monitor");
  assert.equal(await window.evaluate(() => typeof window.require), "undefined");
  const preferences = await desktop.evaluate(({ BrowserWindow }) => {
    const prefs = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return { sandbox: prefs.sandbox, contextIsolation: prefs.contextIsolation, nodeIntegration: prefs.nodeIntegration };
  });
  assert.deepEqual(preferences, { sandbox: true, contextIsolation: true, nodeIntegration: false });
  report.checks.push("Packaged page and isolated renderer loaded");

  // Replace only the main-process network transport for deterministic UI checks.
  await desktop.evaluate(({ net }) => {
    globalThis.originalMarketFetch = net.fetch;
    net.fetch = async (input) => {
      const url = new URL(input);
      const dates = [];
      for (let offset = 150; offset >= 1; offset--) {
        const date = new Date();
        date.setUTCDate(date.getUTCDate() - offset);
        if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) dates.push(date.toISOString().slice(0, 10));
      }
      if (url.hostname === "query1.finance.yahoo.com") {
        const symbol = decodeURIComponent(url.pathname.split("/").at(-1));
        const base = symbol.endsWith("=X") ? 1.1 : 5000;
        return new Response(JSON.stringify({ chart: { result: [{ meta: { exchangeTimezoneName: "America/New_York" },
          timestamp: dates.map((date) => Date.parse(`${date}T16:00:00Z`) / 1000),
          indicators: { quote: [{ close: dates.map((_, i) => base * (1 + i / 1000)) }] },
        }] } }), { headers: { "Content-Type": "application/json" } });
      }
      if (url.hostname === "fred.stlouisfed.org") {
        const symbol = url.searchParams.get("id");
        return new Response(`observation_date,${symbol}\n` + dates.map((date, i) => `${date},${(symbol === "DGS2" ? 4.2 : 4.4) + Math.sin(i / 6) / 10}`).join("\n"));
      }
      const base = url.pathname.includes("VIX3M") ? 20 : 17;
      return new Response("DATE,CLOSE\n" + dates.map((date, i) => `${date.slice(5, 7)}/${date.slice(8)}/${date.slice(0, 4)},${base + Math.sin(i / 5)}`).join("\n"));
    };
  });
  await window.reload();
  await window.getByRole("button", { name: /S&P 500 \(\^GSPC\)/ }).waitFor({ timeout: 30_000 });
  await window.getByLabel("Risk & rates", { exact: true }).check();
  await window.getByRole("heading", { name: "VIX / VIX3M", exact: true }).waitFor();
  await window.getByRole("heading", { name: "US 10Y minus 2Y spread", exact: true }).waitFor();
  assert.ok(await window.locator("canvas").count() > 0);
  assert.match(await window.locator("body").innerText(), /63 matched daily observations/);
  await window.screenshot({ path: path.join(output, packaged ? "packaged-rates.png" : "desktop-rates.png"), fullPage: true });
  await window.getByLabel("Global & currency", { exact: true }).check();
  await window.getByRole("heading", { name: "EUR/USD", exact: true }).waitFor();
  report.checks.push("All data routes, charts, rates, FX, and navigation work with deterministic fixtures");

  await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 800));
  assert.ok(await window.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  report.checks.push("Small desktop window has no horizontal overflow");

  if (live) {
    await desktop.evaluate(({ net }) => { net.fetch = globalThis.originalMarketFetch; });
    const end = Math.floor(Date.now() / 1000);
    const endDate = new Date(end * 1000).toISOString().slice(0, 10);
    const startDate = new Date((end - 30 * 86400) * 1000).toISOString().slice(0, 10);
    for (const route of [
      `/api/yahoo/chart/%5EGSPC?period1=${end - 30 * 86400}&period2=${end}&interval=1d`,
      `/api/fred/graph/fredgraph.csv?id=DGS2&cosd=${startDate}&coed=${endDate}`,
      "/api/cboe/daily_prices/VIX3M_History.csv",
    ]) {
      const result = await window.evaluate(async (route) => {
        const response = await fetch(route);
        const text = await response.text();
        return { route, status: response.status, bytes: text.length, valid: response.ok && (route.includes("yahoo") ? !!JSON.parse(text).chart?.result?.[0]?.timestamp?.length : /^(DATE|observation_date),/.test(text)) };
      }, route);
      report.data.push(result);
      assert.ok(result.valid, `Live data route failed: ${JSON.stringify(result)}`);
    }
    report.checks.push("All three live data providers respond through the desktop protocol");
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile(path.join(output, packaged ? "packaged-report.json" : "desktop-report.json"), JSON.stringify(report, null, 2));
  await desktop.close();
}
