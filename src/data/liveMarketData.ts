import { isYieldSymbol } from "../domain/instruments";
import type { MarketSeries } from "../domain/marketTypes";
import type { MarketDataProvider } from "./marketDataSource";
import { fredMarketData } from "./fredMarketData";
import { yahooMarketData } from "./yahooMarketData";
import { cboeMarketData, isCboeSymbol } from "./cboeMarketData";

export function createLiveMarketData(yahoo: MarketDataProvider, fred: MarketDataProvider, cboe: MarketDataProvider): MarketDataProvider {
  return {
    async getDailyHistory(request) {
      const groups = [
        { provider: yahoo, symbols: request.symbols.filter((symbol) => !isYieldSymbol(symbol) && !isCboeSymbol(symbol)) },
        { provider: fred, symbols: request.symbols.filter(isYieldSymbol) },
        { provider: cboe, symbols: request.symbols.filter(isCboeSymbol) },
      ].filter((group) => group.symbols.length);
      const results = await Promise.allSettled(groups.map(({ provider, symbols }) =>
        provider.getDailyHistory({ ...request, symbols })));
      const series: MarketSeries[] = [];
      const warnings: string[] = [];
      const providers: string[] = [];
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          series.push(...result.value.series);
          warnings.push(...result.value.warnings ?? []);
          providers.push(result.value.provider);
        } else {
          warnings.push(result.reason instanceof Error ? result.reason.message : "Market data source unavailable.");
        }
      });
      const missing = request.symbols.filter((symbol) => !series.some((item) => item.symbol === symbol && item.points.length));
      if (missing.length) warnings.push(`Unavailable: ${missing.join(", ")}.`);
      if (!series.some((item) => item.points.length)) throw new Error(warnings.join(" ") || "Market data is unavailable.");
      return { series, warnings, provider: providers.join(" + "), fetchedAt: new Date().toISOString() };
    },
  };
}

export const liveMarketData = createLiveMarketData(yahooMarketData, fredMarketData, cboeMarketData);
