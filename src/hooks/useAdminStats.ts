import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Order = {
  id: string;
  created_at: string;
  donor_name: string;
  donor_email: string;
  donor_phone: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  currency: string;
  status: string;
  product_id: string;
  matrix_id: string | null;
  provider_txn_id: string | null;
  failure_reason: string | null;
  card_meta: any;
  intention: string | null;
  products?: { code: string | null; title_ar: string | null; title_en: string | null } | null;
  product_price_matrix?: { country_code: string; animal_code: string } | null;
};

export function useOrders() {
  return useQuery({
    queryKey: ["admin-orders"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, products(code, title_ar, title_en), product_price_matrix(country_code, animal_code)")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });
}

function useProducts() {
  return useQuery({
    queryKey: ["admin-products-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, code, title_ar, title_en");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminStats() {
  const { data: orders, ...rest } = useOrders();
  const { data: products } = useProducts();

  const stats = (() => {
    if (!orders) return null;
    const now = Date.now();
    const day = 86400000;
    const last30 = orders.filter((o) => now - new Date(o.created_at).getTime() <= 30 * day);
    const prev30 = orders.filter((o) => {
      const t = now - new Date(o.created_at).getTime();
      return t > 30 * day && t <= 60 * day;
    });

    const sumPaid = (arr: Order[], cur: string) =>
      arr.filter((o) => o.status === "paid" && o.currency === cur).reduce((s, o) => s + o.total_amount, 0);

    const revenueUsd = sumPaid(last30, "USD");
    const revenueUsdPrev = sumPaid(prev30, "USD");
    const revenueTry = sumPaid(last30, "TRY");
    const revenueTryPrev = sumPaid(prev30, "TRY");

    const paid = last30.filter((o) => o.status === "paid").length;
    const failed = last30.filter((o) => o.status === "failed").length;
    const pending = last30.filter((o) => o.status === "pending" || o.status === "awaiting_3ds").length;
    const total = paid + failed;
    const successRate = total > 0 ? (paid / total) * 100 : 0;

    const animals = last30
      .filter((o) => o.status === "paid")
      .reduce((s, o) => s + o.quantity, 0);

    // daily revenue (last 30 days)
    const daily: Record<string, { date: string; usd: number; try: number; orders: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * day);
      const k = d.toISOString().slice(0, 10);
      daily[k] = { date: k.slice(5), usd: 0, try: 0, orders: 0 };
    }
    last30.forEach((o) => {
      const k = new Date(o.created_at).toISOString().slice(0, 10);
      if (!daily[k]) return;
      if (o.status === "paid") {
        if (o.currency === "USD") daily[k].usd += o.total_amount;
        else daily[k].try += o.total_amount;
        daily[k].orders += 1;
      }
    });

    // status counts
    const statusCounts = ["paid", "failed", "pending", "awaiting_3ds", "expired"].map((s) => ({
      status: s,
      count: last30.filter((o) => o.status === s).length,
    }));

    // per-track aggregation (paid only)
    const productMap = new Map(
      (products ?? []).map((p: any) => [p.id, { code: p.code, title: p.title_ar || p.title_en || p.code || "—" }])
    );
    const tracksMap: Record<string, { id: string; code: string; title: string; animals: number; usd: number; try: number; orders: number }> = {};
    last30
      .filter((o) => o.status === "paid")
      .forEach((o) => {
        const meta = productMap.get(o.product_id) ?? { code: "—", title: "—" };
        const key = o.product_id;
        if (!tracksMap[key]) {
          tracksMap[key] = { id: key, code: meta.code ?? "—", title: meta.title, animals: 0, usd: 0, try: 0, orders: 0 };
        }
        tracksMap[key].animals += o.quantity;
        tracksMap[key].orders += 1;
        if (o.currency === "USD") tracksMap[key].usd += o.total_amount;
        else tracksMap[key].try += o.total_amount;
      });
    const tracks = Object.values(tracksMap).sort((a, b) => b.animals - a.animals);

    // failure reasons
    const reasonsMap: Record<string, number> = {};
    last30
      .filter((o) => o.status === "failed" && o.failure_reason)
      .forEach((o) => {
        reasonsMap[o.failure_reason!] = (reasonsMap[o.failure_reason!] ?? 0) + 1;
      });
    const failReasons = Object.entries(reasonsMap)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    return {
      revenueUsd,
      revenueUsdPrev,
      revenueTry,
      revenueTryPrev,
      paid,
      failed,
      pending,
      successRate,
      animals,
      daily: Object.values(daily),
      statusCounts,
      tracks,
      failReasons,
      recent: orders.slice(0, 10),
    };
  })();

  return { stats, orders, ...rest };
}
