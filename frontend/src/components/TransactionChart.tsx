import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Bucket {
  time: string;
  count: number;
}

const WINDOW = 60; // seconds
const MAX_POINTS = 60;

export default function TransactionChart() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const stats = await res.json();
          const now = new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          });

          setBuckets((prev) => {
            const newData = [
              ...prev,
              {
                time: now,
                count: stats.tx_per_sec ?? 0,
              },
            ];
            // Keep only last MAX_POINTS
            return newData.slice(-MAX_POINTS);
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

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-300">
        Transaction Rate Over Time (last 60s)
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={buckets}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            interval={Math.floor(MAX_POINTS / 6)}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#6b7280" }}
            allowDecimals={false}
            label={{
              value: "tx/sec",
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
            formatter={(value: number) => [`${value.toFixed(1)} tx/sec`, "Rate"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#818cf8"
            fill="url(#grad)"
            strokeWidth={2}
            name="Transactions/sec"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
