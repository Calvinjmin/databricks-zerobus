import { useEffect, useState } from "react";
import { useDatabricksHistory } from "../hooks/useDatabricksHistory";
import HistorySummaryCards from "./HistorySummaryCards";
import HistoryCharts from "./HistoryCharts";
import HistoryTransactionTable from "./HistoryTransactionTable";

export default function DatabricksTab() {
  const { summary, transactions, loading, error, refresh, fetchTransactions } =
    useDatabricksHistory();
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleClear() {
    if (!window.confirm("Delete ALL rows from the Delta table? This cannot be undone."))
      return;
    setClearing(true);
    try {
      const res = await fetch("/api/history/clear", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await refresh();
    } catch {
      // error surfaces via refresh
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">
            Databricks Delta Table
          </h2>
          <p className="text-xs text-gray-500">
            Historical data queried from the lakehouse
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            disabled={clearing || loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium transition hover:bg-red-700 disabled:opacity-50"
          >
            {clearing ? "Clearing..." : "Clear Table"}
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Querying..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {summary && <HistorySummaryCards data={summary} />}
      {summary && <HistoryCharts data={summary} />}
      {transactions && (
        <HistoryTransactionTable
          data={transactions}
          onPageChange={async (offset) => {
            try {
              await fetchTransactions(50, offset);
            } catch {
              // error is surfaced via the hook
            }
          }}
        />
      )}
    </div>
  );
}
