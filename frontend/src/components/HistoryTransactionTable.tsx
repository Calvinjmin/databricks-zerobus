import StatusBadge from "./StatusBadge";
import type { HistoryTransactionsResponse } from "../types/history";

interface Props {
  data: HistoryTransactionsResponse;
  onPageChange: (offset: number) => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatAmount(amount: number, currency: string) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });
}

export default function HistoryTransactionTable({ data, onPageChange }: Props) {
  const { transactions, total, limit, offset } = data;
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-300">
          Transactions from Databricks
        </h2>
        <span className="text-xs text-gray-500">
          {total.toLocaleString()} total rows
        </span>
      </div>

      <div className="max-h-[480px] overflow-y-auto">
        {transactions.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-600">
            No transactions found in the Delta table.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-gray-900 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Sender</th>
                <th className="px-4 py-2">Receiver</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className={`border-t border-gray-800/50 transition-colors ${
                    Number(tx.risk_score) > 0.8
                      ? "bg-red-950/30"
                      : "hover:bg-gray-800/40"
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-2 text-gray-400">
                    {formatTime(tx.timestamp)}
                  </td>
                  <td className="px-4 py-2">{tx.sender}</td>
                  <td className="px-4 py-2">{tx.receiver}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-mono">
                    {formatAmount(Number(tx.amount), tx.currency)}
                  </td>
                  <td className="px-4 py-2 capitalize text-gray-400">
                    {tx.type}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={tx.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-800 px-4 py-3">
        <button
          onClick={() => onPageChange(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="rounded bg-gray-800 px-3 py-1.5 text-xs font-medium transition hover:bg-gray-700 disabled:opacity-30"
        >
          Previous
        </button>
        <span className="text-xs text-gray-500">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(offset + limit)}
          disabled={offset + limit >= total}
          className="rounded bg-gray-800 px-3 py-1.5 text-xs font-medium transition hover:bg-gray-700 disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}
