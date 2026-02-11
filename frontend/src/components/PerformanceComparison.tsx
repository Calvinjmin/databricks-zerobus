import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface DataPoint {
  time: string;
  generated: number;
  ingested: number;
  efficiency: number;
}

const MAX_POINTS = 60;

export default function PerformanceComparison() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [lastIngested, setLastIngested] = useState(0);

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

          const currentIngested = stats.ingestion?.total_ingested ?? 0;
          const ingestedDelta = currentIngested - lastIngested;
          setLastIngested(currentIngested);

          const generated = stats.tx_per_sec ?? 0;
          const ingested = ingestedDelta; // Delta per second
          const efficiency =
            generated > 0 ? ((ingested / generated) * 100).toFixed(1) : 0;

          setData((prev) => {
            const newData = [
              ...prev,
              {
                time: now,
                generated,
                ingested,
                efficiency: parseFloat(efficiency),
              },
            ];
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
  }, [lastIngested]);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-300">
        Generation vs Ingestion Rate
      </h2>
      <p className="mb-3 text-xs text-gray-500">
        Compare transaction generation rate with actual ingestion rate to
        showcase async processing
      </p>
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
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="generated"
            stroke="#818cf8"
            strokeWidth={2}
            dot={false}
            name="Generated"
          />
          <Line
            type="monotone"
            dataKey="ingested"
            stroke="#34d399"
            strokeWidth={2}
            dot={false}
            name="Ingested"
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

