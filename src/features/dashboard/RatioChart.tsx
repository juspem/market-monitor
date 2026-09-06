import { useEffect, useRef } from "react";
import { ColorType, CrosshairMode, LineSeries, createChart } from "lightweight-charts";
import type { RatioPoint } from "../../calculations/relativeRatio";

type Props = {
  points: RatioPoint[];
};

export function RatioChart({ points }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

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

    const line = chart.addSeries(LineSeries, { color: "#be123c", lineWidth: 2 });
    line.setData(points.map((point) => ({ time: point.tradingDate, value: point.ratio })));
    chart.timeScale().fitContent();

    const handleCrosshairMove = (param: Parameters<typeof chart.subscribeCrosshairMove>[0]) => {
      const tooltip = tooltipRef.current;
      if (!tooltip || !param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
        if (tooltip) tooltip.hidden = true;
        return;
      }

      const value = param.seriesData.get(line);
      const ratio = value && "value" in value ? value.value : undefined;
      if (ratio === undefined) {
        tooltip.hidden = true;
        return;
      }

      tooltip.innerHTML = `<strong>${param.time}</strong><span><i></i>RSP / SPY ${ratio.toFixed(4)}</span>`;
      tooltip.hidden = false;
      tooltip.style.left = `${Math.min(param.point.x + 14, containerRef.current!.clientWidth - 160)}px`;
      tooltip.style.top = `${Math.max(8, param.point.y - 20)}px`;
    };
    chart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
    };
  }, [points]);

  return (
    <div className="chart-frame chart-frame--ratio chart-frame--interactive" ref={containerRef} aria-label="RSP to SPY ratio chart">
      <div className="chart-tooltip" ref={tooltipRef} hidden />
    </div>
  );
}
