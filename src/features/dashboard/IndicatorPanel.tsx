import { formatIndicatorChange, formatIndicatorValue, type MarketIndicator } from "../../domain/marketIndicators";
import type { MarketPoint } from "../../domain/marketTypes";
import { RatioChart } from "./RatioChart";

type Props = { definition: MarketIndicator; points: MarketPoint[]; source?: string; range: string };

export function IndicatorPanel({ definition, points, source, range }: Props) {
  const latest = points.at(-1);
  return (
    <section className="panel panel--ratio">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{definition.category.toUpperCase()}</p>
          <h2>{definition.label}</h2>
          <p className="ratio-meaning">{definition.meaning}</p>
        </div>
      </div>
      <div className="indicator-reading">
        <strong>{latest ? formatIndicatorValue(latest.close, definition.unit, definition.precision) : "--"}</strong>
        <span>{formatIndicatorChange(points, definition.unit)} <small>over {range}</small></span>
      </div>
      <p className="indicator-source">{latest ? `${source ?? "Market data"} · As of ${latest.tradingDate}` : "Data unavailable"}</p>
      <RatioChart label={definition.label} points={points.map((point) => ({ ...point, ratio: point.close }))}
        precision={definition.precision} suffix={definition.unit === "yield" ? "%" : definition.unit === "basisPoints" ? " bp" : ""}
        referenceValue={definition.unit === "basisPoints" ? 0 : undefined} />
    </section>
  );
}
