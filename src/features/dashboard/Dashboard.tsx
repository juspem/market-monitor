import { useEffect, useState } from "react";
import { calculateRatio } from "../../calculations/relativeRatio";
import { normalizePerformance, type NormalizedPoint } from "../../calculations/normalizePerformance";
import { liveMarketData } from "../../data/liveMarketData";
import { calculateYieldSpread } from "../../calculations/yieldSpread";
import { MARKET_INDICATORS } from "../../domain/marketIndicators";
import { IndicatorPanel } from "./IndicatorPanel";
import { ALL_INSTRUMENTS, INSTRUMENTS, type InstrumentSymbol } from "../../domain/instruments";
import { MARKET_RATIOS } from "../../domain/marketRatios";
import type { MarketSeries } from "../../domain/marketTypes";
import { InstrumentSummary } from "./InstrumentSummary";
import { PerformanceChart, TIME_RANGES, type TimeRange } from "./PerformanceChart";
import { RatioChart } from "./RatioChart";
import { getDashboardState } from "./dashboardState";

const INDEX_LABELS: Record<InstrumentSymbol, string> = {
  "^GSPC": "S&P 500 (^GSPC)",
  "^NDX": "Nasdaq 100 (^NDX)",
  "^RUT": "Russell 2000 (^RUT)",
  "^DJI": "Dow Jones (^DJI)",
  "^SP500EW": "S&P 500 EW (^SP500EW)",
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

const getLegendClass = (symbol: InstrumentSymbol) => symbol.replace(/[^a-z0-9]/gi, "").toLowerCase();
const getInstrumentLabel = (symbol: InstrumentSymbol) => INDEX_LABELS[symbol] ?? symbol;
const CHART_LABELS: Partial<Record<InstrumentSymbol, string>> = {
  "^GSPC": "S&P 500",
  "^NDX": "Nasdaq 100",
  "^RUT": "Russell 2000",
  "^DJI": "Dow Jones",
  "^SP500EW": "S&P 500 EW",
};
const getChartLabel = (symbol: InstrumentSymbol) => CHART_LABELS[symbol] ?? symbol;
const RATIO_SECTIONS: readonly { label: string; categories: readonly string[] }[] = [
  { label: "Breadth & leadership", categories: ["Breadth", "Participation", "Growth"] },
  { label: "Risk & rates", categories: ["Credit", "Volatility", "Rates"] },
  { label: "Commodities", categories: ["Commodities", "Gold", "Oil", "Metals", "Energy"] },
  { label: "Global & currency", categories: ["Global", "Dollar", "Currency"] },
  { label: "Real assets", categories: ["Real estate", "Private equity"] },
] as const;

function getRangeStartDate(range: TimeRange): string | undefined {
  const points = TIME_RANGES.find((item) => item.label === range)?.points;
  if (!points) {
    return undefined;
  }

  const date = new Date();
  date.setUTCDate(date.getUTCDate() - Math.ceil(points * 1.5 + 10));
  return date.toISOString().slice(0, 10);
}

export function Dashboard() {
  const [series, setSeries] = useState<MarketSeries[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentSymbol>("^GSPC");
  const [selectedRange, setSelectedRange] = useState<TimeRange>("3M");
  const [selectedRatioSection, setSelectedRatioSection] = useState(RATIO_SECTIONS[0].label);
  const [loading, setLoading] = useState(true);
  const [fullHistoryRequested, setFullHistoryRequested] = useState(false);
  const [fullHistoryLoaded, setFullHistoryLoaded] = useState(false);
  const [loadedStartDate, setLoadedStartDate] = useState<string>();
  const [loadError, setLoadError] = useState<unknown>();
  const [retryCount, setRetryCount] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [provider, setProvider] = useState("");

  function retryData() {
    setLoadedStartDate(undefined);
    setFullHistoryLoaded(false);
    setRetryCount((count) => count + 1);
  }

  useEffect(() => {
    const dataRange = selectedRange === "3M" ? "1Y" : selectedRange;
    const requestedStartDate = fullHistoryRequested ? undefined : getRangeStartDate(dataRange);

    if (fullHistoryLoaded || (requestedStartDate && loadedStartDate && requestedStartDate >= loadedStartDate)) {
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(undefined);

    void liveMarketData
      .getDailyHistory({ symbols: ALL_INSTRUMENTS, startDate: requestedStartDate, missingData: "report" })
      .then((response) => {
        if (!active) {
          return;
        }
        setSeries(response.series);
        setWarnings(response.warnings ?? []);
        setProvider(response.provider);
        setLoadedStartDate(requestedStartDate);
        if (fullHistoryRequested) {
          setFullHistoryLoaded(true);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [fullHistoryLoaded, fullHistoryRequested, loadedStartDate, selectedRange, retryCount]);

  const state = getDashboardState(series, loadError, loading && series.length === 0);

  const normalized: Partial<Record<InstrumentSymbol, NormalizedPoint[]>> = Object.fromEntries(
    series.filter((item) => INSTRUMENTS.some((symbol) => symbol === item.symbol))
      .map((item) => [item.symbol, normalizePerformance(item.points)]),
  );
  const rangeWindow = TIME_RANGES.find((range) => range.label === selectedRange);
  const selectedRangeNormalized: Partial<Record<InstrumentSymbol, NormalizedPoint[]>> = Object.fromEntries(
    INSTRUMENTS.map((symbol) => {
      const points = normalized[symbol] ?? [];
      if (!points.length) {
        return [symbol, []];
      }
      const limit = rangeWindow?.points ?? points.length;
      const window = limit >= points.length ? points : points.slice(-limit);
      return [symbol, normalizePerformance(window)];
    }),
  );
  const lastUpdated = series[0]?.points.at(-1)?.timestamp;
  const selectWindow = <T,>(points: T[]): T[] => rangeWindow?.points ? points.slice(-rangeWindow.points) : points;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">MARKET MONITOR</p>
          <h1>Broad market view</h1>
          <p className="intro">A compact read on market leadership, breadth, rates, commodities and risk appetite.</p>
        </div>
        <div className="data-badge">
          <span className={loading ? "status-dot status-dot--loading" : "status-dot"} />
          <span>{loading ? "Loading data..." : state === "error" ? "Data error" : warnings.length ? "Partial data" : state === "stale" ? "Delayed data" : provider}</span>
          {provider && <small>{provider}</small>}
          <small>{state === "loading" ? "Loading" : lastUpdated ? `As of ${lastUpdated.slice(0, 10)}` : state}</small>
        </div>
      </header>

      {state === "loading" && <p className="dashboard-message">Loading market data...</p>}
      {state === "error" && (
        <div className="dashboard-message dashboard-message--error" role="alert">
          <p>{loadError instanceof Error ? loadError.message : "Market data is unavailable."}</p>
          <button type="button" onClick={retryData}>Retry</button>
        </div>
      )}
      {state === "empty" && <p className="dashboard-message">No valid market observations are available.</p>}
      {warnings.length > 0 && state !== "error" && (
        <div className="dashboard-message" role="status">
          <p>{warnings.join(" ")}</p>
          <button type="button" disabled={loading} onClick={retryData}>Retry unavailable data</button>
        </div>
      )}

      {(state === "ready" || state === "stale") && <>
        <section className="summary-grid" aria-label="Instrument summaries">
          {INSTRUMENTS.map((symbol) => (
            <InstrumentSummary
              key={symbol}
              symbol={symbol}
              points={selectedRangeNormalized[symbol] ?? []}
              selected={selectedInstrument === symbol}
              onSelect={setSelectedInstrument}
            />
          ))}
        </section>

        <section className="panel panel--wide">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">RELATIVE PERFORMANCE</p>
              <h2>Normalized performance</h2>
            </div>
            <span className="period-label">Selected: {getInstrumentLabel(selectedInstrument)} / {selectedRange}</span>
          </div>
          <PerformanceChart
            series={selectedRangeNormalized}
            selectedInstrument={selectedInstrument}
            selectedRange={selectedRange}
            onRangeChange={(range) => {
              setSelectedRange(range);
              if (range === "ALL") {
                setFullHistoryRequested(true);
              }
            }}
          />
          <div className="legend">
            {INSTRUMENTS.map((symbol) => <span key={symbol}><i className={`legend-dot legend-dot--${getLegendClass(symbol)}`} />{getChartLabel(symbol)}</span>)}
          </div>
        </section>

        <div className="ratio-sections" aria-label="Market regime indicators">
          <fieldset className="ratio-section-selector">
            <legend className="eyebrow">MARKET REGIME</legend>
            <div className="ratio-section-selector__options">
              {RATIO_SECTIONS.map((section) => (
                <label className="ratio-section-selector__option" key={section.label}>
                  <input
                    type="radio"
                    name="ratio-section"
                    value={section.label}
                    checked={selectedRatioSection === section.label}
                    onChange={() => setSelectedRatioSection(section.label)}
                  />
                  <span>{section.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {RATIO_SECTIONS.map((section) => {
            if (section.label !== selectedRatioSection) {
              return null;
            }

            const definitions = MARKET_RATIOS.filter((definition) => section.categories.includes(definition.category));

            return (
              <section className="ratio-section" key={section.label}>
                <div className="section-heading">
                  <h2>{section.label}</h2>
                </div>
                <div className="ratio-grid">
                  {MARKET_INDICATORS.filter((definition) => section.categories.includes(definition.category)).map((definition) => {
                    const underlying = series.find((item) => item.symbol === definition.symbol);
                    const points = definition.id === "us-10y-2y"
                      ? calculateYieldSpread(series.find((item) => item.symbol === "DGS10")?.points ?? [], series.find((item) => item.symbol === "DGS2")?.points ?? [])
                      : underlying?.points ?? [];
                    return <IndicatorPanel key={definition.id} definition={definition} points={selectWindow(points)}
                      source={definition.id === "us-10y-2y" ? "Calculated from FRED Treasury yields" : underlying?.source} range={selectedRange} />;
                  })}
                  {definitions.map((definition) => {
                    const numerator = series.find((item) => item.symbol === definition.numerator);
                    const denominator = series.find((item) => item.symbol === definition.denominator);
                    const ratio = numerator && denominator ? calculateRatio(numerator, denominator) : [];
                    const visibleRatio = selectWindow(ratio);

                    return (
                      <section className="panel panel--ratio" key={definition.id}>
                        <div className="panel-heading">
                          <div>
                            <p className="eyebrow">{definition.category.toUpperCase()}</p>
                            <h2>{definition.label}</h2>
                            <p className="ratio-meaning">{definition.meaning}</p>
                          </div>
                        </div>
                        <p className="ratio-direction">
                          {definition.marketInterpretation.split("; ").map((interpretation) => (
                            <span key={interpretation}>{interpretation}</span>
                          ))}
                        </p>
                        {visibleRatio.length > 0 && <p className="indicator-source">
                          {numerator?.source === denominator?.source ? numerator?.source : `${numerator?.source} / ${denominator?.source}`}
                          {` · ${visibleRatio.length} matched daily observations · ${visibleRatio[0].tradingDate} to ${visibleRatio.at(-1)!.tradingDate}`}
                        </p>}
                        <RatioChart label={definition.label} points={visibleRatio} referenceValue={definition.id === "vix-vix3m" ? 1 : undefined} />
                      </section>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </>}
    </main>
  );
}
