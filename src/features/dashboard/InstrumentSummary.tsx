import type { NormalizedPoint } from "../../calculations/normalizePerformance";
import type { InstrumentSymbol } from "../../domain/instruments";

const INSTRUMENT_LABELS: Record<InstrumentSymbol, string> = {
  "^GSPC": "S&P 500 (^GSPC)",
  "^NDX": "Nasdaq 100 (^NDX)",
  "^RUT": "Russell 2000 (^RUT)",
  "^DJI": "Dow Jones (^DJI)",
  "^SP500EW": "S&P 500 Equal Weight (^SP500EW)",
  HYG: "High Yield Bonds (HYG)",
  TLT: "20+ Year Treasuries (TLT)",
  IEF: "7-10 Year Treasuries (IEF)",
  DBC: "Commodities (DBC)",
  GLD: "Gold (GLD)",
  USO: "Oil (USO)",
  SLV: "Silver (SLV)",
  UNG: "Natural Gas (UNG)",
  UUP: "US Dollar (UUP)",
  EEM: "Emerging Markets (EEM)",
  VNQ: "Real Estate (VNQ)",
  "^VIX": "CBOE Volatility (^VIX)",
  "^VIX3M": "3-month Volatility (^VIX3M)",
  "EURUSD=X": "EUR/USD",
  "JPY=X": "USD/JPY",
  "GBPUSD=X": "GBP/USD",
  DGS2: "US 2-year Treasury yield",
  DGS10: "US 10-year Treasury yield",
  "^W5000": "Wilshire 5000 (^W5000)",
  PSP: "Listed Private Equity (PSP)",
  XLE: "Energy Select Sector (XLE)",
};

const getInstrumentLabel = (symbol: InstrumentSymbol) => INSTRUMENT_LABELS[symbol] ?? symbol;

type Props = {
  symbol: InstrumentSymbol;
  points: NormalizedPoint[];
  selected: boolean;
  onSelect: (symbol: InstrumentSymbol) => void;
};

export function InstrumentSummary({ symbol, points, selected, onSelect }: Props) {
  const latest = points.at(-1);
  const first = points[0];
  const change = latest && first ? latest.normalized - first.normalized : 0;
  const changeClass = change >= 0 ? "positive" : "negative";

  return (
    <button
      className={`${selected ? "summary-card summary-card--selected" : "summary-card"} ${symbol === "^SP500EW" ? "summary-card--long-label" : ""}`}
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(symbol)}
    >
      <div className="summary-card__topline">
        <span className="summary-card__symbol">{getInstrumentLabel(symbol)}</span>
        <span className={`summary-card__change ${changeClass}`}>
          {change >= 0 ? "+" : ""}{change.toFixed(2)}%
        </span>
      </div>
      <strong>{latest?.close.toFixed(2) ?? "--"}</strong>
      <span className="summary-card__caption">Normalized {latest?.normalized.toFixed(2) ?? "--"}</span>
    </button>
  );
}
