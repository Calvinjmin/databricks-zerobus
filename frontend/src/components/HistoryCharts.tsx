import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { HistorySummaryResponse } from "../types/history";

interface Props {
  data: HistorySummaryResponse;
}

const COLORS = [
  "#818cf8",
  "#34d399",
  "#f97316",
  "#ef4444",
  "#a78bfa",
  "#fbbf24",
];

const tooltipStyle = {
  backgroundColor: "#111827",
  border: "1px solid #374151",
  borderRadius: 8,
  fontSize: 12,
};

export default function HistoryCharts({ data }: Props) {
  const typeData = data.by_type.map((d) => ({
    name: d.type,
    value: Number(d.count),
  }));
  const statusData = data.by_status.map((d) => ({
    name: d.status,
    value: Number(d.count),
  }));
  const currencyData = data.by_currency.map((d) => ({
    currency: d.currency,
    volume: Number(d.volume),
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ChartCard title="By Transaction Type">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={typeData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={75}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={false}
              fontSize={11}
            >
              {typeData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="By Status">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={statusData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={75}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={false}
              fontSize={11}
            >
              {statusData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Volume by Currency">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={currencyData}>
            <XAxis
              dataKey="currency"
              tick={{ fontSize: 12, fill: "#9ca3af" }}
            />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="volume" fill="#818cf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-300">{title}</h3>
      {children}
    </div>
  );
}
