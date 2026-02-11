import type { Transaction } from "../types/transaction";
import StatusBadge from "./StatusBadge";

interface Props {
  transactions: Transaction[];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
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

export default function TransactionFeed({ transactions }: Props) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
      <div className="border-b border-gray-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-300">
          Live Transaction Feed
        </h2>
      </div>
      <div className="max-h-[480px] overflow-y-auto">
        {transactions.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-600">
            No transactions yet. Click &quot;Start Ingestion&quot; to begin.
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
                    tx.risk_score > 0.8
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
                    {formatAmount(tx.amount, tx.currency)}
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
    </div>
  );
}
