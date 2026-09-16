import { describe, expect, it, vi } from "vitest";
import { createLiveMarketData } from "./liveMarketData";
import { mockMarketData } from "./mockMarketData";

describe("combined market data", () => {
  it("routes currencies to Yahoo, yields to FRED, and both volatility histories to Cboe", async () => {
    const yahoo = { getDailyHistory: vi.fn(mockMarketData.getDailyHistory) };
    const fred = { getDailyHistory: vi.fn(mockMarketData.getDailyHistory) };
    const cboe = { getDailyHistory: vi.fn(mockMarketData.getDailyHistory) };
    const result = await createLiveMarketData(yahoo, fred, cboe).getDailyHistory({ symbols: ["EURUSD=X", "JPY=X", "GBPUSD=X", "^VIX", "^VIX3M", "DGS2", "DGS10"] });
    expect(yahoo.getDailyHistory.mock.calls[0][0].symbols).toEqual(["EURUSD=X", "JPY=X", "GBPUSD=X"]);
    expect(fred.getDailyHistory.mock.calls[0][0].symbols).toEqual(["DGS2", "DGS10"]);
    expect(cboe.getDailyHistory.mock.calls[0][0].symbols).toEqual(["^VIX", "^VIX3M"]);
    expect(result.series).toHaveLength(7);
    expect(result.warnings).toEqual([]);
  });

  it("keeps Treasury data visible during a Yahoo cooldown and surfaces the reason", async () => {
    const yahoo = { getDailyHistory: vi.fn().mockRejectedValue(new Error("Yahoo HTTP 429. Wait 60 seconds.")) };
    const provider = createLiveMarketData(yahoo, mockMarketData, mockMarketData);
    const result = await provider.getDailyHistory({ symbols: ["^GSPC", "DGS2"] });
    expect(result.series.map((series) => series.symbol)).toEqual(["DGS2"]);
    expect(result.warnings).toEqual(["Yahoo HTTP 429. Wait 60 seconds.", "Unavailable: ^GSPC."]);
    await expect(provider.getDailyHistory({ symbols: ["^GSPC"] })).rejects.toThrow("429");
  });

  it("keeps Yahoo data visible when FRED is unavailable", async () => {
    const fred = { getDailyHistory: vi.fn().mockRejectedValue(new Error("FRED timed out.")) };
    const result = await createLiveMarketData(mockMarketData, fred, mockMarketData).getDailyHistory({ symbols: ["EURUSD=X", "DGS10"] });
    expect(result.series[0].symbol).toBe("EURUSD=X");
    expect(result.warnings).toContain("FRED timed out.");
  });

  it("reports missing Cboe history without substituting Yahoo snapshots", async () => {
    const yahoo = { getDailyHistory: vi.fn(mockMarketData.getDailyHistory) };
    const cboe = { getDailyHistory: vi.fn().mockRejectedValue(new Error("Cboe unavailable.")) };
    const result = await createLiveMarketData(yahoo, mockMarketData, cboe).getDailyHistory({ symbols: ["^GSPC", "^VIX", "^VIX3M"] });
    expect(result.series.map((series) => series.symbol)).toEqual(["^GSPC"]);
    expect(yahoo.getDailyHistory.mock.calls[0][0].symbols).toEqual(["^GSPC"]);
    expect(result.warnings).toContain("Unavailable: ^VIX, ^VIX3M.");
  });
});
