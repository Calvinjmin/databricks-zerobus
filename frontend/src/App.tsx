import { useState } from "react";
import Header from "./components/Header";
import InsightsPanel from "./components/InsightsPanel";
import TransactionChart from "./components/TransactionChart";
import ThroughputChart from "./components/ThroughputChart";
import VolumeChart from "./components/VolumeChart";
import PerformanceComparison from "./components/PerformanceComparison";
import LatencyMetrics from "./components/LatencyMetrics";
import ThroughputEfficiency from "./components/ThroughputEfficiency";
import IngestionMetrics from "./components/IngestionMetrics";
import DatabricksTab from "./components/DatabricksTab";
import { useWebSocket } from "./hooks/useWebSocket";

type Tab = "live" | "databricks";

export default function App() {
  const { transactions, connected } = useWebSocket();
  const [activeTab, setActiveTab] = useState<Tab>("live");

  return (
    <div className="flex min-h-screen flex-col">
      <Header connected={connected} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 lg:p-6">
        <div className="flex gap-1 rounded-lg bg-gray-900 p-1">
          <TabButton
            active={activeTab === "live"}
            onClick={() => setActiveTab("live")}
          >
            Live Dashboard
          </TabButton>
          <TabButton
            active={activeTab === "databricks"}
            onClick={() => setActiveTab("databricks")}
          >
            Databricks History
          </TabButton>
        </div>

        {activeTab === "live" ? (
          <>
            <InsightsPanel transactions={transactions} />
            <ThroughputEfficiency />
            <IngestionMetrics />
            <div className="grid gap-4 lg:grid-cols-2">
              <ThroughputChart />
              <VolumeChart />
            </div>
            <PerformanceComparison />
            <div className="grid gap-4 lg:grid-cols-2">
              <TransactionChart />
              <LatencyMetrics />
            </div>
          </>
        ) : (
          <DatabricksTab />
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-indigo-600 text-white"
          : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
