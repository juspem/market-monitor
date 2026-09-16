import { useEffect, useRef } from "react";
import { ColorType, CrosshairMode, LineSeries, createChart } from "lightweight-charts";
import type { RatioPoint } from "../../calculations/relativeRatio";

type Props = {
  label: string;
  points: RatioPoint[];
  precision?: number;
  suffix?: string;
  referenceValue?: number;
};

export function RatioChart({ label, points, precision = 4, suffix = "", referenceValue }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) {
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

    const line = chart.addSeries(LineSeries, {
      color: "#be123c", lineWidth: 2,
      priceFormat: { type: "custom", minMove: 10 ** -precision, formatter: (value: number) => `${value.toFixed(precision)}${suffix}` },
    });
    line.setData(points.map((point) => ({ time: point.tradingDate, value: point.ratio })));
    if (referenceValue !== undefined) {
      line.createPriceLine({ price: referenceValue, color: "#64748b", lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
    }
    chart.timeScale().fitContent();

    return () => {
      chart.remove();
    };
  }, [label, points, precision, suffix, referenceValue]);

  if (!points.length) return <p className="chart-empty" role="status">No data available for {label} in this range.</p>;

  return (
    <div className="chart-frame chart-frame--ratio chart-frame--interactive" ref={containerRef} aria-label={`${label} chart`}>
    </div>
  );
}
