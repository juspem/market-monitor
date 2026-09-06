import { useEffect, useRef, useState } from "react";
import { ColorType, CrosshairMode, LineSeries, createChart } from "lightweight-charts";
import type { NormalizedPoint } from "../../calculations/normalizePerformance";
import type { InstrumentSymbol } from "../../domain/instruments";

const COLORS: Record<InstrumentSymbol, string> = {
  SPY: "#1d6fa5",
  QQQ: "#d97706",
  IWM: "#087f5b",
  DIA: "#c2410c",
  RSP: "#7c3aed",
};

type Props = {
  series: Partial<Record<InstrumentSymbol, NormalizedPoint[]>>;
  selectedInstrument: InstrumentSymbol;
};

type TimeRange = "1M" | "3M" | "ALL";

const TIME_RANGES: readonly { label: TimeRange; points: number | null }[] = [
  { label: "1M", points: 21 },
  { label: "3M", points: 63 },
  { label: "ALL", points: null },
];

function applyTimeRange(
  chart: ReturnType<typeof createChart>,
  selectedRange: TimeRange,
  pointCount: number,
) {
  const range = TIME_RANGES.find((item) => item.label === selectedRange);
  if (!range?.points || range.points >= pointCount) {
    chart.timeScale().fitContent();
    return;
  }

  chart.timeScale().setVisibleLogicalRange({
    from: Math.max(0, pointCount - range.points),
    to: pointCount - 1,
  });
}

export function PerformanceChart({ series, selectedInstrument }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const pointCountRef = useRef(0);
  const [selectedRange, setSelectedRange] = useState<TimeRange>("3M");

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

    let pointCount = 0;
    Object.entries(series).forEach(([symbol, points]) => {
      if (!points?.length) {
        return;
      }

      pointCount = Math.max(pointCount, points.length);

      const line = chart.addSeries(LineSeries, {
        color: COLORS[symbol as InstrumentSymbol],
        lineWidth: symbol === selectedInstrument ? 3 : 1,
        priceLineVisible: false,
        title: symbol,
      });
      line.setData(points.map((point) => ({ time: point.tradingDate, value: point.normalized })));
    });

    chartRef.current = chart;
    pointCountRef.current = pointCount;
    applyTimeRange(chart, selectedRange, pointCount);

    const handleCrosshairMove = (param: Parameters<typeof chart.subscribeCrosshairMove>[0] extends never ? never : (value: Parameters<typeof chart.subscribeCrosshairMove>[0]) => void) => {
      const tooltip = tooltipRef.current;
      if (!tooltip || !param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
        if (tooltip) tooltip.hidden = true;
        return;
      }

      const values = Object.entries(param.seriesData)
        .map(([symbol, value]) => {
          const numericValue = "value" in value ? value.value : undefined;
          return numericValue === undefined ? "" : `<span><i style="background:${COLORS[symbol as InstrumentSymbol]}"></i>${symbol} ${numericValue.toFixed(2)}</span>`;
        })
        .filter(Boolean)
        .join("");
      tooltip.innerHTML = `<strong>${param.time}</strong>${values}`;
      tooltip.hidden = false;
      tooltip.style.left = `${Math.min(param.point.x + 14, containerRef.current!.clientWidth - 150)}px`;
      tooltip.style.top = `${Math.max(8, param.point.y - 20)}px`;
    };
    chart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chartRef.current = null;
      chart.remove();
    };
  }, [selectedInstrument, series, selectedRange]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || pointCountRef.current === 0) {
      return;
    }

    applyTimeRange(chart, selectedRange, pointCountRef.current);
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
              onClick={() => setSelectedRange(range.label)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-frame chart-frame--interactive" ref={containerRef} aria-label="Normalized performance chart">
        <div className="chart-tooltip" ref={tooltipRef} hidden />
      </div>
    </>
  );
}
