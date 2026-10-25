import { getChartColors, useTheme } from "../../theme";
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
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || points.length < 2) {
      return;
    }

    const colors = getChartColors();
    const chart = createChart(containerRef.current, {
      autoSize: true,
      crosshair: { mode: CrosshairMode.Normal },
      handleScroll: true,
      handleScale: true,
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border },
    });

    const line = chart.addSeries(LineSeries, {
      color: colors.ratio, lineWidth: 2,
      priceLineVisible: false,
      priceFormat: { type: "custom", minMove: 10 ** -precision, formatter: (value: number) => `${value.toFixed(precision)}${suffix}` },
    });
    line.setData(points.map((point) => ({ time: point.tradingDate, value: point.ratio })));
    if (referenceValue !== undefined) {
      line.createPriceLine({ price: referenceValue, color: colors.reference, lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
    }
    chart.timeScale().fitContent();

    return () => {
      chart.remove();
    };
  }, [label, points, precision, suffix, referenceValue, theme]);

  if (!points.length) return <p className="chart-empty" role="status">No data available for {label} in this range.</p>;
  if (points.length === 1) return (
    <p className="chart-empty" role="status">
      {points[0].ratio.toFixed(precision)}{suffix} on {points[0].tradingDate}.
      {" "}Only one observation is available; a trend cannot be shown.
    </p>
  );

  return (
    <div className="chart-frame chart-frame--ratio chart-frame--interactive" ref={containerRef} aria-label={`${label} chart`}>
    </div>
  );
}
