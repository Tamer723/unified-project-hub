import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  delta?: number;
}) {
  const up = delta != null && delta >= 0;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-bold">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      {delta != null && (
        <div className={cn("mt-3 inline-flex items-center gap-1 text-xs font-medium", up ? "text-green-600" : "text-red-600")}>
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(delta).toFixed(1)}% عن الشهر السابق
        </div>
      )}
    </Card>
  );
}

export function statusBadge(status: string) {
  const map: Record<string, string> = {
    paid: "bg-green-100 text-green-700 border-green-200",
    failed: "bg-red-100 text-red-700 border-red-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    awaiting_3ds: "bg-amber-100 text-amber-700 border-amber-200",
    expired: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", map[status] ?? "bg-muted");
}

export function pctChange(curr: number, prev: number): number | undefined {
  if (prev === 0) return curr === 0 ? 0 : undefined;
  return ((curr - prev) / prev) * 100;
}
