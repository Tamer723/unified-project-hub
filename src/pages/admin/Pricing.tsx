import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Row = {
  id: string;
  product_id: string;
  country_code: string;
  animal_code: string;
  price: number;
  currency: string;
  active: boolean;
};

function PriceEditor({
  row,
  disabled,
  onSave,
  onToggle,
}: {
  row: Row;
  disabled: boolean;
  onSave: (id: string, price: number) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const [value, setValue] = useState(String(row.price));

  useEffect(() => {
    setValue(String(row.price));
  }, [row.price]);

  return (
    <div className="flex items-center gap-3">
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const nextValue = Number.parseInt(value, 10);

          if (!Number.isFinite(nextValue) || nextValue <= 0) {
            setValue(String(row.price));
            return;
          }

          if (nextValue !== row.price) {
            onSave(row.id, nextValue);
          }
        }}
        className="h-8 w-24 rounded-full border-border/80 bg-background px-4 text-center text-sm font-medium shadow-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label={`سعر ${row.animal_code} في ${row.country_code}`}
      />
      <Switch
        checked={row.active}
        disabled={disabled}
        onCheckedChange={(checked) => onToggle(row.id, checked)}
        aria-label={`تفعيل ${row.animal_code} في ${row.country_code}`}
      />
    </div>
  );
}

export default function Pricing() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-matrix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_price_matrix")
        .select("*")
        .order("country_code");
      if (error) throw error;
      return data as Row[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Row> }) => {
      const { error } = await supabase.from("product_price_matrix").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم الحفظ");
      qc.invalidateQueries({ queryKey: ["admin-matrix"] });
      qc.invalidateQueries({ queryKey: ["pricing"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading)
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  // pivot by country
  const countries = Array.from(new Set((data ?? []).map((r) => r.country_code))).sort();
  const animals = Array.from(new Set((data ?? []).map((r) => r.animal_code))).sort();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">مصفوفة الأسعار</h2>
        <p className="text-sm text-muted-foreground">أسعار مسار التوزيع حسب الدولة ونوع الحيوان</p>
      </div>
      <Card className="overflow-hidden border-border/80 bg-card/90">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b">
              <th className="w-24 px-4 py-3 text-start font-medium">الدولة</th>
              {animals.map((a) => (
                <th key={a} className="px-4 py-3 text-start font-medium">{a}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {countries.map((c) => {
              const rows = (data ?? []).filter((r) => r.country_code === c);
              return (
                <tr key={c} className="border-b last:border-0 align-middle">
                  <td className="px-4 py-4 font-mono text-base font-bold">{c}</td>
                  {animals.map((a) => {
                    const r = rows.find((x) => x.animal_code === a);
                    if (!r) {
                      return (
                        <td key={a} className="px-4 py-4 text-center text-muted-foreground">
                          —
                        </td>
                      );
                    }

                    return (
                      <td key={a} className="px-4 py-4">
                        <PriceEditor
                          row={r}
                          disabled={update.isPending}
                          onSave={(id, price) => update.mutate({ id, patch: { price } })}
                          onToggle={(id, active) => update.mutate({ id, patch: { active } })}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
