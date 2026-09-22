import { readFile } from "node:fs/promises";

export async function createThirdPartyNotices() {
  const licenses = [
    ["React", "node_modules/react/LICENSE"],
    ["React DOM", "node_modules/react-dom/LICENSE"],
    ["React Scheduler", "node_modules/scheduler/LICENSE"],
    ["TradingView Lightweight Charts", "node_modules/lightweight-charts/LICENSE"],
    ["TradingView attribution notice", "docs/lightweight-charts-NOTICE.txt"],
    ["Fancy Canvas", "docs/fancy-canvas-LICENSE.txt"],
    ["DM Sans font", "node_modules/@fontsource/dm-sans/LICENSE"],
    ["Space Grotesk font", "node_modules/@fontsource/space-grotesk/LICENSE"],
  ];
  const notices = ["Market Monitor third-party notices\nCharts by TradingView: https://www.tradingview.com/\nWindows distributions also include separate Electron and Chromium license files."];
  for (const [name, file] of licenses) {
    notices.push(`${name}\n${await readFile(new URL(`../${file}`, import.meta.url), "utf8")}`);
  }
  return notices.join("\n\n----------------------------------------\n\n");
}
