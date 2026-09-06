import { useEffect, useRef, useState } from "react";
import { ColorType, CrosshairMode, LineSeries, createChart } from "lightweight-charts";
import type { NormalizedPoint } from "../../calculations/normalizePerformance";
import type { InstrumentSymbol } from "../../domain/instruments";

const COLORS: Partial<Record<InstrumentSymbol, string>> = {
  "^GSPC": "#1d6fa5",
  "^NDX": "#d97706",
  "^RUT": "#087f5b",
  "^DJI": "#c2410c",
  "^SP500EW": "#7c3aed",
  "^VIX": "#f43f5e",
};

const CHART_LABELS: Partial<Record<InstrumentSymbol, string>> = {
  "^GSPC": "S&P 500",
  "^NDX": "Nasdaq 100",
  "^RUT": "Russell 2000",
  "^DJI": "Dow Jones",
  "^SP500EW": "S&P 500 EW",
};

export type TimeRange = "1W" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "10Y" | "ALL";

export const TIME_RANGES: readonly { label: TimeRange; points: number | null }[] = [
  { label: "1W", points: 5 },
  { label: "1M", points: 21 },
  { label: "3M", points: 63 },
  { label: "6M", points: 126 },
  { label: "1Y", points: 252 },
  { label: "3Y", points: 756 },
  { label: "5Y", points: 1260 },
  { label: "10Y", points: 2520 },
  { label: "ALL", points: null },
];

type Props = {
  series: Partial<Record<InstrumentSymbol, NormalizedPoint[]>>;
  selectedInstrument: InstrumentSymbol;
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
};

function applyTimeRange(chart: ReturnType<typeof createChart>, selectedRange: TimeRange, lastTradingDate: string) {
  const range = TIME_RANGES.find((item) => item.label === selectedRange);
  if (!range?.points) {
    chart.timeScale().fitContent();
    return;
  }

  const end = new Date(`${lastTradingDate}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() - range.points);
  chart.timeScale().setVisibleRange({
    from: end.toISOString().slice(0, 10),
    to: lastTradingDate,
  });
}

export function PerformanceChart({ series, selectedInstrument, selectedRange, onRangeChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const lastTradingDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
      autoSize: true,
      crosshair: { mode: CrosshairMode.Normal },
      handleScroll: true,
      handleScale: true,
      layout: {
        background: { type: ColorType.Solid, color: "#f8fafc" },
        textColor: "#475569",
      },
      grid: {
        vertLines: { color: "#e2e8f0" },
        horzLines: { color: "#e2e8f0" },
      },
      rightPriceScale: { borderColor: "#cbd5e1" },
      timeScale: { borderColor: "#cbd5e1" },
    });

    let lastTradingDate: string | null = null;
    Object.entries(series).forEach(([symbol, points]) => {
      if (!points?.length) {
        return;
      }

      const seriesLastDate = points.at(-1)?.tradingDate;
      if (seriesLastDate && (!lastTradingDate || seriesLastDate > lastTradingDate)) {
        lastTradingDate = seriesLastDate;
      }

      const line = chart.addSeries(LineSeries, {
        color: COLORS[symbol as InstrumentSymbol] ?? "#64748b",
        lineWidth: symbol === selectedInstrument ? 3 : 1,
        priceLineVisible: false,
        title: CHART_LABELS[symbol as InstrumentSymbol] ?? symbol,
      });
      line.setData(points.map((point) => ({ time: point.tradingDate, value: point.normalized })));
    });

    chartRef.current = chart;
    lastTradingDateRef.current = lastTradingDate;
    if (lastTradingDate) {
      applyTimeRange(chart, selectedRange, lastTradingDate);
    }

    return () => {
      chartRef.current = null;
      chart.remove();
    };
  }, [selectedInstrument, series]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !lastTradingDateRef.current) {
      return;
    }

    applyTimeRange(chart, selectedRange, lastTradingDateRef.current);
  }, [selectedRange]);

  return (
    <>
      <div className="chart-toolbar" aria-label="Chart time range">
        <span className="chart-toolbar__label">Range</span>
        <div className="range-selector" role="group" aria-label="Select time range">
          {TIME_RANGES.map((range) => (
            <button
              key={range.label}
              className={selectedRange === range.label ? "range-selector__button range-selector__button--active" : "range-selector__button"}
              type="button"
              aria-pressed={selectedRange === range.label}
              onClick={() => onRangeChange(range.label)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-frame chart-frame--interactive" ref={containerRef} aria-label="Normalized performance chart">
      </div>
    </>
  );
}
