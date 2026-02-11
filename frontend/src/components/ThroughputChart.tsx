import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface DataPoint {
  time: string;
  txPerSec: number;
  ingested: number;
}

const MAX_POINTS = 60; // 60 seconds of data

export default function ThroughputChart() {
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
                txPerSec: stats.tx_per_sec ?? 0,
                ingested: stats.ingestion?.total_ingested ?? 0,
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
        Throughput (Transactions/sec)
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
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
          <Line
            type="monotone"
            dataKey="txPerSec"
            stroke="#818cf8"
            strokeWidth={2}
            dot={false}
            name="Throughput"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

