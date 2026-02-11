import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

interface LatencyData {
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export default function LatencyMetrics() {
  const [latencyData, setLatencyData] = useState<LatencyData | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          const ingestion = data.ingestion;
          if (ingestion && ingestion.avg_latency_ms > 0) {
            setLatencyData({
              avg: ingestion.avg_latency_ms ?? 0,
              min: ingestion.min_latency_ms ?? 0,
              max: ingestion.max_latency_ms ?? 0,
              p50: ingestion.p50_latency_ms ?? 0,
              p95: ingestion.p95_latency_ms ?? 0,
              p99: ingestion.p99_latency_ms ?? 0,
            });
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

  if (!latencyData || latencyData.avg === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-300">
          Latency Percentiles
        </h2>
        <p className="text-center text-sm text-gray-500 py-8">
          Waiting for latency data...
        </p>
      </div>
    );
  }

  const chartData = [
    { name: "Min", value: latencyData.min, color: "#34d399" },
    { name: "P50", value: latencyData.p50, color: "#818cf8" },
    { name: "Avg", value: latencyData.avg, color: "#60a5fa" },
    { name: "P95", value: latencyData.p95, color: "#f59e0b" },
    { name: "P99", value: latencyData.p99, color: "#ef4444" },
    { name: "Max", value: latencyData.max, color: "#dc2626" },
  ];

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-300">
        Latency Percentiles (ms)
      </h2>
      <p className="mb-3 text-xs text-gray-500">
        ACK latency distribution showing performance characteristics
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "#6b7280" }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#6b7280" }}
            label={{
              value: "ms",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle", fill: "#9ca3af", fontSize: 12 },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value.toFixed(2)} ms`, "Latency"]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

