import type { NormalizedPoint } from "../../calculations/normalizePerformance";
import type { InstrumentSymbol } from "../../domain/instruments";

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
      className={selected ? "summary-card summary-card--selected" : "summary-card"}
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(symbol)}
    >
      <div className="summary-card__topline">
        <span className="summary-card__symbol">{symbol}</span>
        <span className={`summary-card__change ${changeClass}`}>
          {change >= 0 ? "+" : ""}{change.toFixed(2)}%
        </span>
      </div>
      <strong>{latest?.close.toFixed(2) ?? "--"}</strong>
      <span className="summary-card__caption">Normalized {latest?.normalized.toFixed(2) ?? "--"}</span>
    </button>
  );
}
