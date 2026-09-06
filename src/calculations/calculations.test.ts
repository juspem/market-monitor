import { describe, expect, it } from "vitest";
import { calculateRatio } from "./relativeRatio";
import { normalizePerformance } from "./normalizePerformance";

const point = (tradingDate: string, close: number) => ({
  timestamp: `${tradingDate}T14:30:00.000Z`,
  tradingDate,
  close,
});

const series = (symbol: "^SP500EW" | "^GSPC", points: ReturnType<typeof point>[]) => ({
  symbol,
  points,
  missingDates: [],
  status: "mock" as const,
  source: "mock",
  exchangeTimeZone: "America/New_York",
  fetchedAt: "2026-01-07T00:00:00.000Z",
});

describe("normalizePerformance", () => {
  it("uses the first close as 100", () => {
    const result = normalizePerformance([point("2026-01-02", 50), point("2026-01-05", 55)]);
    expect(result.map((item) => item.normalized)).toEqual([100, 110]);
  });

  it("rounds normalized values to two decimals and preserves trading dates", () => {
    const result = normalizePerformance([
      point("2026-01-02", 37),
      point("2026-01-05", 38),
    ]);

    expect(result).toEqual([
      { ...point("2026-01-02", 37), normalized: 100 },
      { ...point("2026-01-05", 38), normalized: 102.7 },
    ]);
  });

  it("returns no points for empty or zero-based input", () => {
    expect(normalizePerformance([])).toEqual([]);
    expect(normalizePerformance([point("2026-01-02", 0)])).toEqual([]);
  });
});

describe("calculateRatio", () => {
  it("uses only matching trading dates", () => {
    const result = calculateRatio(
      series("^SP500EW", [point("2026-01-02", 100), point("2026-01-06", 110)]),
      series("^GSPC", [point("2026-01-02", 200)]),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.ratio).toBe(0.5);
  });

  it("omits dates missing from either ^RSP or ^GSPC", () => {
    const result = calculateRatio(
      series("^SP500EW", [
        point("2026-01-02", 100),
        point("2026-01-05", 105),
        point("2026-01-06", 110),
      ]),
      series("^GSPC", [
        point("2026-01-02", 200),
        point("2026-01-06", 220),
      ]),
    );

    expect(result.map((item) => item.tradingDate)).toEqual(["2026-01-02", "2026-01-06"]);
  });

  it("does not match points with different trading dates", () => {
    const result = calculateRatio(
      series("^SP500EW", [point("2026-01-05", 105)]),
      series("^GSPC", [point("2026-01-06", 210)]),
    );

    expect(result).toEqual([]);
  });

  it("omits a matching date when ^GSPC has a zero close", () => {
    const result = calculateRatio(
      series("^SP500EW", [point("2026-01-02", 100)]),
      series("^GSPC", [point("2026-01-02", 0)]),
    );

    expect(result).toEqual([]);
  });
});
