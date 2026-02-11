import { useEffect, useMemo, useState } from "react";
import type { Transaction } from "../types/transaction";

interface Props {
  transactions: Transaction[];
}

interface Stats {
  total_count: number;
  total_volume: number;
  avg_amount: number;
  anomaly_count: number;
  tx_per_sec: number;
}

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default function InsightsPanel({ transactions }: Props) {
  // Get stats from backend API (accurate totals, not limited by buffer)
  const [stats, setStats] = useState<Stats | null>(null);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          setStats({
            total_count: data.total_count ?? 0,
            total_volume: data.total_volume ?? 0,
            avg_amount: data.avg_amount ?? 0,
            anomaly_count: data.anomaly_count ?? 0,
            tx_per_sec: data.tx_per_sec ?? 0,
          });
        }
      } catch {
        // ignore
      }
    };
    
    fetchStats();
    const id = setInterval(fetchStats, 1000);
    return () => clearInterval(id);
  }, []);

  // Fallback to local calculations if stats not available yet
  const { totalCount, totalVolume, avgAmount, anomalyCount } = useMemo(() => {
    if (stats) {
      return {
        totalCount: stats.total_count,
        totalVolume: stats.total_volume,
        avgAmount: stats.avg_amount,
        anomalyCount: stats.anomaly_count,
      };
    }
    // Fallback: calculate from buffer (limited accuracy)
    const count = transactions.length;
    const volume = transactions.reduce((s, t) => s + t.amount, 0);
    const anomalies = transactions.filter((t) => t.risk_score > 0.8).length;
    return {
      totalCount: count,
      totalVolume: volume,
      avgAmount: count ? volume / count : 0,
      anomalyCount: anomalies,
    };
  }, [transactions, stats]);

  const txPerSec = stats?.tx_per_sec ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Card label="Transactions" value={totalCount.toLocaleString()} />
      <Card label="Total Volume" value={formatCurrency(totalVolume)} />
      <Card label="Avg Amount" value={formatCurrency(avgAmount)} />
      <Card
        label="Anomalies"
        value={anomalyCount.toString()}
        accent={anomalyCount > 0 ? "text-orange-400" : undefined}
      />
      <Card label="Tx / sec" value={txPerSec.toFixed(1)} />
    </div>
  );
}

function Card({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${accent ?? "text-gray-100"}`}>
        {value}
      </p>
    </div>
  );
}
