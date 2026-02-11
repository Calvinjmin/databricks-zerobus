import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  connected: boolean;
}

function formatElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function Header({ connected }: Props) {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [throttle, setThrottle] = useState(50);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Poll for elapsed time when running
  useEffect(() => {
    if (!running) {
      setElapsedSeconds(0);
      return;
    }
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          setElapsedSeconds(data.elapsed_seconds ?? 0);
          setRunning(data.running ?? false);
        }
      } catch {
        // ignore
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [running]);

  async function toggle() {
    setLoading(true);
    try {
      const endpoint = running ? "/api/stop" : "/api/start";
      await fetch(endpoint, { method: "POST" });
      setRunning(!running);
      if (!running) {
        setElapsedSeconds(0);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleThrottleChange = useCallback((value: number) => {
    setThrottle(value);
    // Debounce the API call so we don't flood the server while dragging
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/throttle?value=${value}`, { method: "POST" });
    }, 100);
  }, []);

  return (
    <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-indigo-400">ZeroBus</span> Transaction Monitor
          </h1>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span
              className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-500"}`}
            />
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="flex items-center gap-5">
          {running && (
            <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-1.5">
              <span className="text-xs text-gray-400">Runtime</span>
              <span className="font-mono text-sm font-medium tabular-nums text-indigo-300">
                {formatElapsed(elapsedSeconds)}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Speed</span>
            <input
              type="range"
              min={1}
              max={100}
              value={throttle}
              onChange={(e) => handleThrottleChange(Number(e.target.value))}
              className="h-1.5 w-32 cursor-pointer appearance-none rounded-full bg-gray-700 accent-indigo-500"
            />
            <span className="w-8 text-center text-xs font-medium tabular-nums text-gray-300">
              {throttle}
            </span>
          </div>

          <button
            onClick={toggle}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              running
                ? "bg-red-600 hover:bg-red-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            } disabled:opacity-50`}
          >
            {loading ? "..." : running ? "Stop Ingestion" : "Start Ingestion"}
          </button>
        </div>
      </div>
    </header>
  );
}
