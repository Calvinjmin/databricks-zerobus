import { useEffect, useState } from "react";

interface IngestionMetrics {
  total_ingested: number;
  total_failed: number;
  pending_acks: number;
  avg_latency_ms: number;
  queue_size: number;
}

export default function IngestionMetrics() {
  const [metrics, setMetrics] = useState<IngestionMetrics | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          if (data.ingestion) {
            setMetrics(data.ingestion);
          }
        }
      } catch {
        // ignore
      }
    };

    fetchMetrics();
    const id = setInterval(fetchMetrics, 1000);
    return () => clearInterval(id);
  }, []);

  if (!metrics) {
    return null;
  }

  const successRate =
    metrics.total_ingested + metrics.total_failed > 0
      ? (
          (metrics.total_ingested /
            (metrics.total_ingested + metrics.total_failed)) *
          100
        ).toFixed(1)
      : "0.0";

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-300">
        ZeroBus SDK Performance
      </h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <MetricCard
          label="Total Ingested"
          value={metrics.total_ingested.toLocaleString()}
          accent="text-indigo-300"
        />
        <MetricCard
          label="Failed"
          value={metrics.total_failed.toString()}
          accent={metrics.total_failed > 0 ? "text-red-400" : "text-gray-400"}
        />
        <MetricCard
          label="Success Rate"
          value={`${successRate}%`}
          accent={
            parseFloat(successRate) >= 99
              ? "text-emerald-400"
              : parseFloat(successRate) >= 95
                ? "text-yellow-400"
                : "text-red-400"
          }
        />
        <MetricCard
          label="Pending ACKs"
          value={metrics.pending_acks.toString()}
          accent="text-blue-300"
        />
        <MetricCard
          label="Avg Latency"
          value={`${metrics.avg_latency_ms}ms`}
          accent="text-purple-300"
        />
        <MetricCard
          label="Queue Size"
          value={metrics.queue_size.toString()}
          accent="text-cyan-300"
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-3">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${accent ?? "text-gray-200"}`}>
        {value}
      </p>
    </div>
  );
}

