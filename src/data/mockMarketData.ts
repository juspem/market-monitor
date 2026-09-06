import { INSTRUMENTS, type InstrumentSymbol } from "../domain/instruments";
import type {
  DailyHistoryRequest,
  MarketPoint,
  MarketSeries,
} from "../domain/marketTypes";
import type { MarketDataProvider } from "./marketDataSource";

const START_DATE = "2026-01-02";
const EXCHANGE_TIME_ZONE = "America/New_York";
const MARKET_OPEN_HOUR = 9;
const MARKET_OPEN_MINUTE = 30;
const MARKET_HOLIDAYS = new Set([
  "2026-01-19",
  "2026-02-16",
  "2026-04-03",
  "2026-05-25",
  "2026-06-19",
  "2026-07-03",
  "2026-09-07",
  "2026-11-26",
  "2026-12-25",
]);
const BASE_PRICES: Record<InstrumentSymbol, number> = {
  "^GSPC": 5600,
  "^NDX": 19750,
  "^RUT": 2180,
  "^DJI": 38500,
  "^SP500EW": 165,
  HYG: 78,
  TLT: 90,
  IEF: 93,
  DBC: 25,
  GLD: 240,
  USO: 75,
  SLV: 28,
  UNG: 14,
  UUP: 29,
  EEM: 42,
  VNQ: 92,
  "^VIX": 18,
  "^W5000": 77000,
  PSP: 62,
  XLE: 64,
};

function createTradingDates(count: number): string[] {
  const dates: string[] = [];
  const current = new Date(`${START_DATE}T00:00:00.000Z`);

  while (dates.length < count) {
    const tradingDate = current.toISOString().slice(0, 10);
    const weekday = current.getUTCDay();
    if (weekday !== 0 && weekday !== 6 && !MARKET_HOLIDAYS.has(tradingDate)) {
      dates.push(tradingDate);
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function createExchangeTimestamp(tradingDate: string): string {
  const [year, month, day] = tradingDate.split("-").map(Number);
  const localTimeAsUtc = Date.UTC(year, month - 1, day, MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EXCHANGE_TIME_ZONE,
    calendar: "iso8601",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(localTimeAsUtc));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  const displayedLocalTimeAsUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
  );
  const offset = displayedLocalTimeAsUtc - localTimeAsUtc;

  return new Date(localTimeAsUtc - offset).toISOString();
}

function createSeries(symbol: InstrumentSymbol): MarketSeries {
  const points: MarketPoint[] = createTradingDates(60).map((date, index) => {
    const cycle = Math.sin((index + symbol.length) / 4) * 0.012;
    const trend = index * 0.0018;
    const close = BASE_PRICES[symbol] * (1 + trend + cycle);

    return {
      timestamp: createExchangeTimestamp(date),
      tradingDate: date,
      close: Number(close.toFixed(2)),
    };
  });

  return {
    symbol,
    points,
    missingDates: [],
    status: "mock",
    source: "mock",
    exchangeTimeZone: EXCHANGE_TIME_ZONE,
    fetchedAt: new Date().toISOString(),
  };
}

function filterSeries(series: MarketSeries, request: DailyHistoryRequest): MarketSeries {
  const points = series.points.filter((point) => {
    const afterStart = !request.startDate || point.tradingDate >= request.startDate;
    const beforeEnd = !request.endDate || point.tradingDate <= request.endDate;
    return afterStart && beforeEnd;
  });

  return { ...series, points };
}

export const mockMarketData: MarketDataProvider = {
  async getDailyHistory(request: DailyHistoryRequest) {
    const series = request.symbols.map(createSeries).map((item) => filterSeries(item, request));
    const fetchedAt = new Date().toISOString();

    return {
      series: series.map((item) => ({ ...item, fetchedAt })),
      provider: "mock",
      fetchedAt,
    };
  },
};

