import { describe, expect, it } from "vitest";
import type { MarketSeries } from "../../domain/marketTypes";
import { getDashboardState } from "./dashboardState";

const series = (overrides: Partial<MarketSeries> = {}): MarketSeries => ({
  symbol: "^GSPC",
  points: [{
    timestamp: "2026-03-09T13:30:00.000Z",
    tradingDate: "2026-03-09",
    close: 580,
  }],
  missingDates: [],
  status: "mock",
  source: "mock",
  exchangeTimeZone: "America/New_York",
  fetchedAt: "2026-03-09T14:00:00.000Z",
  ...overrides,
});

describe("getDashboardState", () => {
  it("returns loading while the provider request is pending", () => {
    expect(getDashboardState([], undefined, true)).toBe("loading");
  });

  it("returns empty for no series", () => {
    expect(getDashboardState([])).toBe("empty");
  });

  it("returns stale when a series is marked stale", () => {
    expect(getDashboardState([series({ status: "stale" })])).toBe("stale");
  });

  it("returns stale when a series is delayed", () => {
    expect(getDashboardState([series({ status: "delayed" })])).toBe("stale");
  });

  it("returns error when loading failed", () => {
    expect(getDashboardState([], new Error("provider failed"))).toBe("error");
  });

  it("rejects series without valid market observations", () => {
    expect(getDashboardState([series({
      points: [{ timestamp: "invalid", tradingDate: "not-a-date", close: Number.NaN }],
    })])).toBe("empty");
  });

  it("returns ready for valid observations", () => {
    expect(getDashboardState([series()])).toBe("ready");
  });
});