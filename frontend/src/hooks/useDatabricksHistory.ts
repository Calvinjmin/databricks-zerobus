import { useState, useCallback } from "react";
import type {
  HistorySummaryResponse,
  HistoryTransactionsResponse,
} from "../types/history";

export function useDatabricksHistory() {
  const [summary, setSummary] = useState<HistorySummaryResponse | null>(null);
  const [transactions, setTransactions] =
    useState<HistoryTransactionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    const res = await fetch("/api/history/summary");
    const data: HistorySummaryResponse = await res.json();
    if (data.error) throw new Error(data.error);
    setSummary(data);
  }, []);

  const fetchTransactions = useCallback(async (limit = 50, offset = 0) => {
    const res = await fetch(
      `/api/history/transactions?limit=${limit}&offset=${offset}`,
    );
    const data: HistoryTransactionsResponse = await res.json();
    if (data.error) throw new Error(data.error);
    setTransactions(data);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchSummary(), fetchTransactions()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [fetchSummary, fetchTransactions]);

  return { summary, transactions, loading, error, refresh, fetchTransactions };
}
