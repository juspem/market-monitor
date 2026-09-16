import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RatioChart } from "./RatioChart";

describe("ratio history display", () => {
  it("shows a dated reading and an insufficient-history message for a single observation", () => {
    const html = renderToStaticMarkup(<RatioChart label="VIX / VIX3M" points={[
      { timestamp: "2026-09-15T00:00:00.000Z", tradingDate: "2026-09-15", ratio: 0.8884 },
    ]} />);
    expect(html).toContain("0.8884");
    expect(html).toContain("2026-09-15");
    expect(html).toContain("Only one observation is available; a trend cannot be shown.");
    expect(html).not.toContain("chart-frame");
  });

  it("keeps empty history distinct from a single reading", () => {
    const html = renderToStaticMarkup(<RatioChart label="VIX / VIX3M" points={[]} />);
    expect(html).toContain("No data available");
    expect(html).not.toContain("Only one observation");
  });
});
