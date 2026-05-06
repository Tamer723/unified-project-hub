import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOrders, type Order } from "@/hooks/useAdminStats";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { statusBadge } from "@/components/admin/ui";
import { Download, Loader2 } from "lucide-react";

const fmt = (n: number, c: string) =>
  c === "USD" ? `$${n.toLocaleString("en-US")}` : `${n.toLocaleString("tr-TR")} ₺`;

const COUNTRY_CODES = ["JM", "WB", "LB", "SY", "SD", "YE", "BD"] as const;
const ANIMAL_CODES = ["sheep", "cow_share"] as const;

const COUNTRY_FLAGS: Record<string, string> = {
  JM: "🇵🇸", WB: "🇵🇸", LB: "🇱🇧", SY: "🇸🇾",
  SD: "🇸🇩", YE: "🇾🇪", BD: "🇧🇩",
};
const ANIMAL_EMOJI: Record<string, string> = { sheep: "🐏", cow_share: "🐄" };

function isoFlag(code?: string | null): string {
  if (!code || code.length !== 2) return "";
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

const trackLabel = (o: Order) => o.products?.title_ar || o.products?.title_en || o.products?.code || "—";

export default function Orders() {
  const { t } = useTranslation();
  const { data: orders, isLoading } = useOrders();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [country, setCountry] = useState("all");
  const [animal, setAnimal] = useState("all");
  const [donorCountry, setDonorCountry] = useState("all");
  const [active, setActive] = useState<Order | null>(null);

  const countryName = (code?: string | null) =>
    code ? `${COUNTRY_FLAGS[code] ?? ""} ${t(`track3.countries.${code}`, code)}`.trim() : "—";
  const animalName = (code?: string | null) =>
    code ? `${ANIMAL_EMOJI[code] ?? ""} ${t(`track3.animals.${code}`, code)}`.trim() : "—";

  const donorCountries = useMemo(() => {
    const set = new Set<string>();
    (orders ?? []).forEach((o) => o.donor_country && set.add(o.donor_country));
    return Array.from(set).sort();
  }, [orders]);

  const filtered = useMemo(() => {
    let r = orders ?? [];
    if (status !== "all") r = r.filter((o) => o.status === status);
    if (country !== "all") r = r.filter((o) => o.product_price_matrix?.country_code === country);
    if (animal !== "all") r = r.filter((o) => o.product_price_matrix?.animal_code === animal);
    if (donorCountry !== "all") r = r.filter((o) => o.donor_country === donorCountry);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(
        (o) =>
          o.donor_name.toLowerCase().includes(q) ||
          o.donor_email.toLowerCase().includes(q) ||
          (o.provider_txn_id ?? "").toLowerCase().includes(q) ||
          (o.donor_ip ?? "").toLowerCase().includes(q),
      );
    }
    return r;
  }, [orders, status, country, animal, donorCountry, search]);

  const exportCsv = () => {
    const headers = ["id", "created_at", "donor_name", "donor_email", "donor_ip", "donor_country", "track_code", "track_title", "country_code", "country_name", "animal_code", "animal_name", "quantity", "unit_price", "total_amount", "currency", "status", "txn"];
    const rows = filtered.map((o) => {
      const cc = o.product_price_matrix?.country_code ?? "";
      const ac = o.product_price_matrix?.animal_code ?? "";
      return [
        o.id,
        o.created_at,
        o.donor_name,
        o.donor_email,
        o.donor_ip ?? "",
        o.donor_country ?? "",
        o.products?.code ?? "",
        trackLabel(o),
        cc,
        cc ? t(`track3.countries.${cc}`, cc) : "",
        ac,
        ac ? t(`track3.animals.${ac}`, ac) : "",
        o.quantity,
        o.unit_price,
        o.total_amount,
        o.currency,
        o.status,
        o.provider_txn_id ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">الطلبات</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} طلب</p>
        </div>
        <Button onClick={exportCsv} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> تصدير CSV
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 mb-4">
          <Input
            placeholder="بحث بالاسم أو البريد أو رقم العملية..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="paid">paid</SelectItem>
              <SelectItem value="failed">failed</SelectItem>
              <SelectItem value="pending">pending</SelectItem>
              <SelectItem value="awaiting_3ds">awaiting_3ds</SelectItem>
              <SelectItem value="expired">expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-44"><SelectValue placeholder="الدولة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الدول</SelectItem>
              {COUNTRY_CODES.map((c) => (
                <SelectItem key={c} value={c}>{COUNTRY_FLAGS[c]} {t(`track3.countries.${c}`, c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={animal} onValueChange={setAnimal}>
            <SelectTrigger className="w-40"><SelectValue placeholder="النوع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              {ANIMAL_CODES.map((a) => (
                <SelectItem key={a} value={a}>{ANIMAL_EMOJI[a]} {t(`track3.animals.${a}`, a)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={donorCountry} onValueChange={setDonorCountry}>
            <SelectTrigger className="w-44"><SelectValue placeholder="دولة المتبرع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل دول المتبرعين</SelectItem>
              {donorCountries.map((c) => (
                <SelectItem key={c} value={c}>{isoFlag(c)} {c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-start py-2 font-medium">التاريخ</th>
                  <th className="text-start py-2 font-medium">المتبرع</th>
                  <th className="text-start py-2 font-medium">المصدر</th>
                  <th className="text-start py-2 font-medium">المسار</th>
                  <th className="text-start py-2 font-medium">الكمية</th>
                  <th className="text-start py-2 font-medium">المبلغ</th>
                  <th className="text-start py-2 font-medium">الحالة</th>
                  <th className="text-start py-2 font-medium">البطاقة</th>
                  <th className="text-start py-2 font-medium">العملية</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const cc = o.product_price_matrix?.country_code;
                  const ac = o.product_price_matrix?.animal_code;
                  return (
                    <tr
                      key={o.id}
                      onClick={() => setActive(o)}
                      className="border-b last:border-0 cursor-pointer hover:bg-muted/40"
                    >
                      <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(o.created_at).toLocaleString("ar")}
                      </td>
                      <td className="py-2">
                        <div>{o.donor_name}</div>
                        <div className="text-[10px] text-muted-foreground">{o.donor_email}</div>
                      </td>
                      <td className="py-2">
                        <div className="font-medium">{trackLabel(o)}</div>
                        {cc || ac ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {cc && (
                              <span className="inline-flex items-center rounded-full bg-sand/40 px-2 py-0.5 text-[10px] font-semibold text-brown">
                                {COUNTRY_FLAGS[cc] ?? ""} {t(`track3.countries.${cc}`, cc)}
                              </span>
                            )}
                            {ac && (
                              <span className="inline-flex items-center rounded-full bg-green-pale px-2 py-0.5 text-[10px] font-semibold text-green">
                                {ANIMAL_EMOJI[ac] ?? ""} {t(`track3.animals.${ac}`, ac)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground font-mono">{o.products?.code ?? "—"}</div>
                        )}
                      </td>
                      <td className="py-2">{o.quantity}</td>
                      <td className="py-2 font-mono">{fmt(o.total_amount, o.currency)}</td>
                      <td className="py-2"><span className={statusBadge(o.status)}>{o.status}</span></td>
                      <td className="py-2 font-mono text-xs">**** {o.card_meta?.last4 ?? "—"}</td>
                      <td className="py-2 font-mono text-xs">{o.provider_txn_id ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>تفاصيل الطلب</SheetTitle>
          </SheetHeader>
          {active && (
            <div className="mt-6 space-y-3 text-sm">
              <Row k="ID" v={active.id} />
              <Row k="الحالة" v={active.status} />
              <Row k="المسار" v={`${trackLabel(active)}${active.products?.code ? ` (${active.products.code})` : ""}`} />
              {active.product_price_matrix && (
                <>
                  <Row k="الدولة" v={countryName(active.product_price_matrix.country_code)} />
                  <Row k="الحيوان" v={animalName(active.product_price_matrix.animal_code)} />
                </>
              )}
              <Row k="المتبرع" v={active.donor_name} />
              <Row k="البريد" v={active.donor_email} />
              <Row k="الهاتف" v={active.donor_phone ?? "—"} />
              <Row k="النية" v={active.intention ?? "—"} />
              <Row k="الكمية" v={String(active.quantity)} />
              <Row k="سعر الوحدة" v={fmt(active.unit_price, active.currency)} />
              <Row k="الإجمالي" v={fmt(active.total_amount, active.currency)} />
              <Row k="رقم العملية" v={active.provider_txn_id ?? "—"} />
              <Row k="آخر 4" v={active.card_meta?.last4 ?? "—"} />
              <Row k="العلامة" v={active.card_meta?.brand ?? "—"} />
              <Row k="سبب الفشل" v={active.failure_reason ?? "—"} />
              <Row k="أُنشئ" v={new Date(active.created_at).toLocaleString("ar")} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-2">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className="font-medium text-end break-all">{v}</span>
    </div>
  );
}
