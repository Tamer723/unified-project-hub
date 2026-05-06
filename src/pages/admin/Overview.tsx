import { useAdminStats } from "@/hooks/useAdminStats";
import { StatCard, statusBadge, pctChange } from "@/components/admin/ui";
import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle2, Beef } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Loader2 } from "lucide-react";

const fmtUsd = (n: number) => `$${n.toLocaleString("en-US")}`;
const fmtTry = (n: number) => `${n.toLocaleString("tr-TR")} ₺`;

export default function Overview() {
  const { stats, isLoading } = useAdminStats();
  if (isLoading || !stats)
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">نظرة عامة</h2>
        <p className="text-sm text-muted-foreground">آخر 30 يوماً — يحدّث كل 30 ثانية</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="الإيرادات (USD)"
          value={fmtUsd(stats.revenueUsd)}
          icon={DollarSign}
          delta={pctChange(stats.revenueUsd, stats.revenueUsdPrev)}
        />
        <StatCard
          label="الإيرادات (TRY)"
          value={fmtTry(stats.revenueTry)}
          icon={TrendingUp}
          delta={pctChange(stats.revenueTry, stats.revenueTryPrev)}
        />
        <StatCard
          label="طلبات ناجحة"
          value={String(stats.paid)}
          hint={`نسبة النجاح ${stats.successRate.toFixed(1)}%`}
          icon={CheckCircle2}
        />
        <StatCard
          label="طلبات فاشلة"
          value={String(stats.failed)}
          hint={`${stats.pending} معلّقة`}
          icon={AlertTriangle}
        />
        <StatCard label="متوسط الطلب" value={fmtUsd(Math.round(stats.aov))} icon={ShoppingCart} />
        <StatCard label="إجمالي الأضاحي" value={String(stats.animals)} icon={Beef} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">الإيرادات اليومية (USD)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.daily}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="usd" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">عدد الطلبات حسب الحالة</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.statusCounts}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4">آخر الطلبات</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-start py-2 font-medium">المتبرع</th>
                  <th className="text-start py-2 font-medium">المبلغ</th>
                  <th className="text-start py-2 font-medium">الحالة</th>
                  <th className="text-start py-2 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2">{o.donor_name}</td>
                    <td className="py-2 font-mono">
                      {o.currency === "USD" ? fmtUsd(o.total_amount) : fmtTry(o.total_amount)}
                    </td>
                    <td className="py-2">
                      <span className={statusBadge(o.status)}>{o.status}</span>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("ar")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">أسباب الفشل</h3>
          {stats.failReasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا يوجد فشل في الفترة.</p>
          ) : (
            <ul className="space-y-2">
              {stats.failReasons.map((r) => (
                <li key={r.reason} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{r.reason}</span>
                  <span className="font-bold">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
