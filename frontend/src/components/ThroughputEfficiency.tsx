import { useEffect, useState } from "react";

interface EfficiencyData {
  throughput: number;
  efficiency: number;
  queueUtilization: number;
  ingestionRate: number;
}

export default function ThroughputEfficiency() {
  const [data, setData] = useState<EfficiencyData | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const stats = await res.json();
          const ingestion = stats.ingestion;
          
          if (ingestion) {
            const throughput = stats.tx_per_sec ?? 0;
            const queueSize = ingestion.queue_size ?? 0;
            const queueCapacity = 2000; // From backend config
            const queueUtilization = (queueSize / queueCapacity) * 100;
            
            // Calculate efficiency: how well we're keeping up with generation
            // This is a simplified calculation
            const efficiency = throughput > 0 
              ? Math.min(100, ((ingestion.total_ingested / (stats.total_count || 1)) * 100))
              : 0;
            
            setData({
              throughput,
              efficiency: Math.round(efficiency),
              queueUtilization: Math.round(queueUtilization),
              ingestionRate: ingestion.total_ingested,
            });
          }
        }
      } catch {
        // ignore
      }
    };

    fetchStats();
    const id = setInterval(fetchStats, 1000);
    return () => clearInterval(id);
  }, []);

  if (!data) {
    return null;
  }

  const getEfficiencyColor = (eff: number) => {
    if (eff >= 95) return "text-emerald-400";
    if (eff >= 80) return "text-yellow-400";
    return "text-red-400";
  };

  const getQueueColor = (util: number) => {
    if (util < 50) return "text-emerald-400";
    if (util < 80) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-300">
        Throughput Efficiency
      </h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Current Throughput"
          value={`${data.throughput.toFixed(1)} tx/sec`}
          accent="text-indigo-300"
        />
        <MetricCard
          label="Ingestion Efficiency"
          value={`${data.efficiency}%`}
          accent={getEfficiencyColor(data.efficiency)}
        />
        <MetricCard
          label="Queue Utilization"
          value={`${data.queueUtilization}%`}
          accent={getQueueColor(data.queueUtilization)}
        />
        <MetricCard
          label="Total Ingested"
          value={data.ingestionRate.toLocaleString()}
          accent="text-cyan-300"
        />
      </div>
      {data.queueUtilization > 80 && (
        <div className="mt-3 rounded-lg border border-yellow-800 bg-yellow-950/30 p-2 text-xs text-yellow-400">
          ⚠️ High queue utilization - ingestion may be lagging behind generation
        </div>
      )}
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

