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
  weight_kg: number | null;
};

function NumberCell({
  value,
  disabled,
  onSave,
  ariaLabel,
  allowEmpty = false,
  width = "w-24",
}: {
  value: number | null;
  disabled: boolean;
  onSave: (next: number | null) => void;
  ariaLabel: string;
  allowEmpty?: boolean;
  width?: string;
}) {
  const [text, setText] = useState(value == null ? "" : String(value));
  useEffect(() => {
    setText(value == null ? "" : String(value));
  }, [value]);

  return (
    <Input
      type="number"
      inputMode="decimal"
      min={0}
      value={text}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text.trim() === "") {
          if (allowEmpty && value != null) {
            onSave(null);
            return;
          }
          setText(value == null ? "" : String(value));
          return;
        }
        const next = Number(text);
        if (!Number.isFinite(next) || next < 0) {
          setText(value == null ? "" : String(value));
          return;
        }
        if (next !== value) onSave(next);
      }}
      className={`h-8 ${width} rounded-full border-border/80 bg-background px-3 text-center text-sm font-medium shadow-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      aria-label={ariaLabel}
    />
  );
}

function CellEditor({
  row,
  disabled,
  onSavePrice,
  onSaveWeight,
  onToggle,
}: {
  row: Row;
  disabled: boolean;
  onSavePrice: (id: string, price: number) => void;
  onSaveWeight: (id: string, weight: number | null) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <NumberCell
        value={row.price}
        disabled={disabled}
        onSave={(v) => v != null && onSavePrice(row.id, v)}
        ariaLabel={`سعر ${row.animal_code} في ${row.country_code}`}
      />
      <NumberCell
        value={row.weight_kg}
        disabled={disabled}
        onSave={(v) => onSaveWeight(row.id, v)}
        ariaLabel={`وزن ${row.animal_code} في ${row.country_code}`}
        allowEmpty
        width="w-20"
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

  const countries = Array.from(new Set((data ?? []).map((r) => r.country_code))).sort();
  const animals = Array.from(new Set((data ?? []).map((r) => r.animal_code))).sort();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">مصفوفة الأسعار</h2>
        <p className="text-sm text-muted-foreground">السعر ($) ، الوزن (كغ) والتفعيل لكل دولة ونوع حيوان</p>
      </div>
      <Card className="overflow-hidden border-border/80 bg-card/90">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] table-fixed border-collapse text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b">
              <th className="w-24 px-4 py-3 text-start font-medium">الدولة</th>
              {animals.map((a) => (
                <th key={a} className="px-4 py-3 text-start font-medium">
                  {a}
                  <span className="ms-1 text-[10px] text-muted-foreground/70">(سعر / وزن / تفعيل)</span>
                </th>
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
                        <CellEditor
                          row={r}
                          disabled={update.isPending}
                          onSavePrice={(id, price) => update.mutate({ id, patch: { price } })}
                          onSaveWeight={(id, weight_kg) => update.mutate({ id, patch: { weight_kg } })}
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
