export interface HistorySummaryResponse {
  summary: Array<{
    total_rows: string;
    total_volume: string;
    avg_amount: string;
    anomaly_count: string;
    anomaly_pct: string;
    earliest: string;
    latest: string;
  }>;
  by_type: Array<{ type: string; count: string; volume: string }>;
  by_status: Array<{ status: string; count: string }>;
  by_currency: Array<{ currency: string; count: string; volume: string }>;
  error?: string;
}

export interface HistoryTransactionsResponse {
  transactions: Array<{
    id: string;
    timestamp: string;
    sender: string;
    receiver: string;
    amount: string;
    currency: string;
    type: string;
    status: string;
    category: string;
    risk_score: string;
  }>;
  total: number;
  limit: number;
  offset: number;
  error?: string;
}
