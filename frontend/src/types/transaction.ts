export interface Transaction {
  id: string;
  timestamp: string;
  sender: string;
  receiver: string;
  amount: number;
  currency: string;
  type: "payment" | "transfer" | "refund" | "withdrawal";
  status: "pending" | "completed" | "failed" | "flagged";
  category: string;
  risk_score: number;
}

export interface Stats {
  total_count: number;
  total_volume: number;
  anomaly_count: number;
  avg_amount: number;
  tx_per_sec: number;
  ingested_to_databricks: number;
}
