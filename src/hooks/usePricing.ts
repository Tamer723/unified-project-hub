import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  FALLBACK_MATRIX,
  TRACK_PRICES,
  type AnimalCode,
  type CountryCode,
} from "@/lib/pricing";

export type ProductRow = {
  id: string;
  code: string | null;
  base_price: number;
  pricing_type: string;
};

export type MatrixRow = {
  id: string;
  product_id: string;
  country_code: string;
  animal_code: string;
  price: number;
};

export function usePricing() {
  return useQuery({
    queryKey: ["pricing"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [products, matrix] = await Promise.all([
        supabase.from("products").select("id, code, base_price, pricing_type").eq("active", true),
        supabase.from("product_price_matrix").select("id, product_id, country_code, animal_code, price").eq("active", true),
      ]);
      return {
        products: (products.data ?? []) as ProductRow[],
        matrix: (matrix.data ?? []) as MatrixRow[],
      };
    },
  });
}

/** Resolve unit price (USD whole units) for track1/2/3 with DB → fallback. */
export function resolveTrackPrice(
  trackCode: "track1" | "track2" | "track3",
  data: { products: ProductRow[]; matrix: MatrixRow[] } | undefined,
  country?: CountryCode,
  animal?: AnimalCode,
): number {
  const product = data?.products.find((p) => p.code === trackCode);

  if (trackCode === "track3") {
    if (country && animal) {
      const row = data?.matrix.find(
        (m) => m.product_id === product?.id && m.country_code === country && m.animal_code === animal,
      );
      if (row) return row.price;
      return FALLBACK_MATRIX[country][animal];
    }
    return TRACK_PRICES.track3From;
  }

  if (product) return product.base_price;
  return trackCode === "track1" ? TRACK_PRICES.track1 : TRACK_PRICES.track2;
}

export function getProductId(
  trackCode: "track1" | "track2" | "track3",
  data: { products: ProductRow[]; matrix: MatrixRow[] } | undefined,
): string | undefined {
  return data?.products.find((p) => p.code === trackCode)?.id;
}

export function getMatrixId(
  data: { products: ProductRow[]; matrix: MatrixRow[] } | undefined,
  country: CountryCode,
  animal: AnimalCode,
): string | undefined {
  const product = data?.products.find((p) => p.code === "track3");
  return data?.matrix.find(
    (m) => m.product_id === product?.id && m.country_code === country && m.animal_code === animal,
  )?.id;
}
