const colors: Record<string, string> = {
  completed: "bg-emerald-500/20 text-emerald-400",
  pending: "bg-yellow-500/20 text-yellow-400",
  failed: "bg-red-500/20 text-red-400",
  flagged: "bg-orange-500/20 text-orange-400",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-700 text-gray-300"}`}
    >
      {status}
    </span>
  );
}
