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

interface DataPoint {
  time: string;
  volume: number;
  count: number;
}

const MAX_POINTS = 60; // 60 seconds of data

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default function VolumeChart() {
  const [data, setData] = useState<DataPoint[]>([]);

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

          setData((prev) => {
            const newData = [
              ...prev,
              {
                time: now,
                volume: stats.total_volume ?? 0,
                count: stats.total_count ?? 0,
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
        Cumulative Volume Over Time
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
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
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            label={{
              value: "Volume",
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
            formatter={(value: number) => [
              formatCurrency(value),
              "Total Volume",
            ]}
          />
          <Area
            type="monotone"
            dataKey="volume"
            stroke="#34d399"
            fill="url(#volumeGrad)"
            strokeWidth={2}
            name="Volume"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

