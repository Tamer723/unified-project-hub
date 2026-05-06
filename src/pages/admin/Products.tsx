import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Product = {
  id: string;
  code: string | null;
  base_price: number;
  currency: string;
  pricing_type: string;
  active: boolean;
  display_order: number;
  title_ar: string | null;
  title_en: string | null;
  title_tr: string | null;
  image_url: string | null;
  image_url_ar: string | null;
  image_url_en: string | null;
  image_url_tr: string | null;
};

export default function Products() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as Product[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Product> }) => {
      const { error } = await supabase.from("products").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم الحفظ");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">المنتجات</h2>
        <p className="text-sm text-muted-foreground">إدارة المسارات والأسعار الأساسية</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((p) => (
          <Card key={p.id} className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground font-mono">{p.code}</div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">فعّال</Label>
                <Switch
                  checked={p.active}
                  onCheckedChange={(v) => update.mutate({ id: p.id, patch: { active: v } })}
                />
              </div>
            </div>
            <Field label="العنوان (AR)" defaultValue={p.title_ar ?? ""} onSave={(v) => update.mutate({ id: p.id, patch: { title_ar: v } })} />
            <Field label="العنوان (EN)" defaultValue={p.title_en ?? ""} onSave={(v) => update.mutate({ id: p.id, patch: { title_en: v } })} />
            <Field label="العنوان (TR)" defaultValue={p.title_tr ?? ""} onSave={(v) => update.mutate({ id: p.id, patch: { title_tr: v } })} />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="السعر الأساسي"
                type="number"
                defaultValue={String(p.base_price)}
                onSave={(v) => update.mutate({ id: p.id, patch: { base_price: parseInt(v, 10) } })}
              />
              <Field
                label="الترتيب"
                type="number"
                defaultValue={String(p.display_order)}
                onSave={(v) => update.mutate({ id: p.id, patch: { display_order: parseInt(v, 10) } })}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              العملة: <span className="font-mono">{p.currency}</span> · النوع: <span className="font-mono">{p.pricing_type}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  defaultValue,
  type = "text",
  onSave,
}: {
  label: string;
  defaultValue: string;
  type?: string;
  onSave: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        defaultValue={defaultValue}
        onBlur={(e) => {
          if (e.target.value !== defaultValue) onSave(e.target.value);
        }}
        className="mt-1"
      />
    </div>
  );
}
