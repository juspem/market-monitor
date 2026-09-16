import type { InstrumentSymbol } from "./instruments";
import type { MarketPoint } from "./marketTypes";

export type IndicatorUnit = "fx" | "yield" | "basisPoints";
export type MarketIndicator = {
  id: string;
  symbol?: InstrumentSymbol;
  label: string;
  category: "Currency" | "Rates";
  unit: IndicatorUnit;
  precision: number;
  meaning: string;
};

export const MARKET_INDICATORS: readonly MarketIndicator[] = [
  { id: "eur-usd", symbol: "EURUSD=X", label: "EUR/USD", category: "Currency", unit: "fx", precision: 4,
    meaning: "US dollars per euro. Rising means the euro strengthens against the dollar." },
  { id: "usd-jpy", symbol: "JPY=X", label: "USD/JPY", category: "Currency", unit: "fx", precision: 3,
    meaning: "Japanese yen per US dollar. Rising means the dollar strengthens and the yen weakens." },
  { id: "gbp-usd", symbol: "GBPUSD=X", label: "GBP/USD", category: "Currency", unit: "fx", precision: 4,
    meaning: "US dollars per pound. Rising means the pound strengthens against the dollar." },
  { id: "us-2y", symbol: "DGS2", label: "US 2-year Treasury yield", category: "Rates", unit: "yield", precision: 2,
    meaning: "Daily constant-maturity yield. Changes are shown in basis points." },
  { id: "us-10y", symbol: "DGS10", label: "US 10-year Treasury yield", category: "Rates", unit: "yield", precision: 2,
    meaning: "Daily constant-maturity yield. Changes are shown in basis points." },
  { id: "us-10y-2y", label: "US 10Y minus 2Y spread", category: "Rates", unit: "basisPoints", precision: 1,
    meaning: "Below zero indicates an inverted curve. Rising means the curve is steepening; falling means it is flattening or becoming more inverted." },
];

export function formatIndicatorValue(value: number, unit: IndicatorUnit, precision: number): string {
  return `${value.toFixed(precision)}${unit === "yield" ? "%" : unit === "basisPoints" ? " bp" : ""}`;
}

export function formatIndicatorChange(points: readonly MarketPoint[], unit: IndicatorUnit): string {
  const first = points[0]?.close;
  const last = points.at(-1)?.close;
  if (points.length < 2 || first === undefined || last === undefined || (unit === "fx" && first === 0)) {
    return "Change unavailable";
  }
  const change = unit === "fx" ? (last / first - 1) * 100 : (last - first) * (unit === "yield" ? 100 : 1);
  const rounded = Number(change.toFixed(unit === "fx" ? 2 : 1));
  return `${rounded >= 0 ? "+" : ""}${rounded.toFixed(unit === "fx" ? 2 : 1)}${unit === "fx" ? "%" : " bp"}`;
}
