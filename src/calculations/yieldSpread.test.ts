import { describe, expect, it } from "vitest";
import type { MarketPoint } from "../domain/marketTypes";
import { formatIndicatorChange, formatIndicatorValue } from "../domain/marketIndicators";
import { calculateYieldSpread } from "./yieldSpread";

const point = (day: number, close: number): MarketPoint => ({ tradingDate: `2026-09-${day}`, timestamp: `2026-09-${day}T00:00:00.000Z`, close });

describe("native indicator units", () => {
  it("calculates positive, negative and zero spreads in basis points using only matching dates", () => {
    const points = calculateYieldSpread([point(10, 4.1), point(11, 4.2), point(14, 4.4), point(15, 4.8)],
      [point(10, 4.3), point(11, 4.2), point(14, 4.1)]);
    expect(points.map((point) => point.close)).toEqual([-20, 0, 30]);
    expect(formatIndicatorChange(points, "basisPoints")).toBe("+50.0 bp");
  });

  it("shows yield changes in basis points and FX changes in percent", () => {
    expect(formatIndicatorChange([point(10, 4.2), point(11, 4.3)], "yield")).toBe("+10.0 bp");
    expect(formatIndicatorChange([point(10, 1.1), point(11, 1.111)], "fx")).toBe("+1.00%");
    expect(formatIndicatorChange([point(10, 0), point(11, -10)], "basisPoints")).toBe("-10.0 bp");
    expect(formatIndicatorChange([point(10, 4.2)], "yield")).toBe("Change unavailable");
  });

  it("retains FX precision and distinguishes yield and spread units", () => {
    expect(formatIndicatorValue(1.0812, "fx", 4)).toBe("1.0812");
    expect(formatIndicatorValue(150.125, "fx", 3)).toBe("150.125");
    expect(formatIndicatorValue(4.21, "yield", 2)).toBe("4.21%");
    expect(formatIndicatorValue(-20, "basisPoints", 1)).toBe("-20.0 bp");
  });
});
