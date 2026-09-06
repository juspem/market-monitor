import { useEffect, useState } from "react";
import { calculateRatio } from "../../calculations/relativeRatio";
import { normalizePerformance, type NormalizedPoint } from "../../calculations/normalizePerformance";
import { mockMarketData } from "../../data/mockMarketData";
import { INSTRUMENTS, type InstrumentSymbol } from "../../domain/instruments";
import type { MarketSeries } from "../../domain/marketTypes";
import { InstrumentSummary } from "./InstrumentSummary";
import { PerformanceChart } from "./PerformanceChart";
import { RatioChart } from "./RatioChart";

export function Dashboard() {
  const [series, setSeries] = useState<MarketSeries[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentSymbol>("SPY");

  useEffect(() => {
    void mockMarketData
      .getDailyHistory({ symbols: INSTRUMENTS, missingData: "report" })
      .then((response) => setSeries(response.series));
  }, []);

  const normalized: Partial<Record<InstrumentSymbol, NormalizedPoint[]>> = Object.fromEntries(
    series.map((item) => [item.symbol, normalizePerformance(item.points)]),
  );
  const rsp = series.find((item) => item.symbol === "RSP");
  const spy = series.find((item) => item.symbol === "SPY");
  const ratio = rsp && spy ? calculateRatio(rsp, spy) : [];
  const lastUpdated = series[0]?.points.at(-1)?.timestamp;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">MARKET MONITOR / MVP</p>
          <h1>Broad market view</h1>
          <p className="intro">A compact read on index leadership and equal-weight breadth.</p>
        </div>
        <div className="data-badge">
          <span className="status-dot" />
          <span>Mock data</span>
          <small>{lastUpdated ? `As of ${lastUpdated.slice(0, 10)}` : "Loading"}</small>
        </div>
      </header>

      <section className="summary-grid" aria-label="Instrument summaries">
        {INSTRUMENTS.map((symbol) => (
          <InstrumentSummary
            key={symbol}
            symbol={symbol}
            points={normalized[symbol] ?? []}
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
          <span className="period-label">Selected: {selectedInstrument} / 60 trading days</span>
        </div>
        <PerformanceChart series={normalized} selectedInstrument={selectedInstrument} />
        <div className="legend">
          {INSTRUMENTS.map((symbol) => <span key={symbol}><i className={`legend-dot legend-dot--${symbol.toLowerCase()}`} />{symbol}</span>)}
        </div>
      </section>

      <section className="panel panel--ratio">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">BREADTH SIGNAL</p>
            <h2>RSP / SPY ratio</h2>
          </div>
          <span className="period-label">Same-day observations only</span>
        </div>
        <RatioChart points={ratio} />
      </section>
    </main>
  );
}
