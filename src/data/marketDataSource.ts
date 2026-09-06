import type {
  DailyHistoryRequest,
  DailyHistoryResponse,
} from "../domain/marketTypes";

export interface MarketDataProvider {
  getDailyHistory(request: DailyHistoryRequest): Promise<DailyHistoryResponse>;
}

export type MarketDataSource = MarketDataProvider;
