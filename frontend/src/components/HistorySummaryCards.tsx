import type { HistorySummaryResponse } from "../types/history";

interface Props {
  data: HistorySummaryResponse;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default function HistorySummaryCards({ data }: Props) {
  const s = data.summary[0];
  if (!s) return null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Card label="Total Rows" value={Number(s.total_rows).toLocaleString()} />
      <Card label="Total Volume" value={fmt(Number(s.total_volume))} />
      <Card label="Avg Amount" value={fmt(Number(s.avg_amount))} />
      <Card
        label="Anomalies"
        value={Number(s.anomaly_count).toLocaleString()}
        accent={Number(s.anomaly_count) > 0 ? "text-orange-400" : undefined}
      />
      <Card
        label="Anomaly Rate"
        value={`${s.anomaly_pct}%`}
        accent={Number(s.anomaly_pct) > 5 ? "text-orange-400" : undefined}
      />
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
