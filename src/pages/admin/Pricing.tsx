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
      <Card className="p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b">
              <th className="text-start py-2 font-medium">الدولة</th>
              {animals.map((a) => (
                <th key={a} className="text-start py-2 font-medium">{a}</th>
              ))}
              <th className="text-start py-2 font-medium">فعّال</th>
            </tr>
          </thead>
          <tbody>
            {countries.map((c) => {
              const rows = (data ?? []).filter((r) => r.country_code === c);
              return (
                <tr key={c} className="border-b last:border-0">
                  <td className="py-2 font-mono font-bold">{c}</td>
                  {animals.map((a) => {
                    const r = rows.find((x) => x.animal_code === a);
                    if (!r) return <td key={a} className="py-2 text-muted-foreground">—</td>;
                    return (
                      <td key={a} className="py-2">
                        <Input
                          type="number"
                          defaultValue={String(r.price)}
                          onBlur={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (v !== r.price) update.mutate({ id: r.id, patch: { price: v } });
                          }}
                          className="h-8 w-24"
                        />
                      </td>
                    );
                  })}
                  <td className="py-2">
                    {rows.map((r) => (
                      <div key={r.id} className="flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground">{r.animal_code}:</span>
                        <Switch
                          checked={r.active}
                          onCheckedChange={(v) => update.mutate({ id: r.id, patch: { active: v } })}
                        />
                      </div>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
