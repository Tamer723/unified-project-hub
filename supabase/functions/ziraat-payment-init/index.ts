import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Body = z.object({
  donor: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    phone: z.string().max(40).optional().nullable(),
  }),
  intention: z.string().max(200).optional().nullable(),
  quantity: z.number().int().min(1).max(100),
  unit_price: z.number().int().min(1),
  currency: z.enum(["USD", "TRY"]),
  product_id: z.string().uuid().optional().nullable(),
  matrix_id: z.string().uuid().optional().nullable(),
  card: z.object({
    number: z.string().min(13).max(25),
    holder: z.string().min(2).max(80),
    expMonth: z.number().int().min(1).max(12),
    expYear: z.number().int().min(2025).max(2099),
    cvc: z.string().min(3).max(4),
  }),
});

function detectBrand(d: string): string {
  if (/^4/.test(d)) return "visa";
  if (/^3[47]/.test(d)) return "amex";
  if (/^(5[1-5]|2(2(2[1-9]|[3-9]\d)|[3-6]\d{2}|7([01]\d|20)))/.test(d)) return "mastercard";
  if (/^9792/.test(d)) return "troy";
  return "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ responseCode: "400", responseMessage: "Invalid input", details: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { donor, intention, quantity, unit_price, currency, product_id, matrix_id, card } = parsed.data;
    const digits = card.number.replace(/\D/g, "");
    const last4 = digits.slice(-4);
    const bin = digits.slice(0, 6);
    const brand = detectBrand(digits);

    // Resolve product_id if not provided (use first active product as fallback for mock).
    let resolvedProduct = product_id;
    if (!resolvedProduct) {
      const { data: p } = await supabase
        .from("products")
        .select("id")
        .eq("active", true)
        .order("display_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      resolvedProduct = p?.id ?? null;
    }
    if (!resolvedProduct) {
      return new Response(JSON.stringify({ responseCode: "500", responseMessage: "No product configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const txnId = `MOCK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const total = unit_price * quantity;
    const expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { data: order, error: insErr } = await supabase
      .from("orders")
      .insert({
        product_id: resolvedProduct,
        matrix_id: matrix_id ?? null,
        donor_name: donor.name,
        donor_email: donor.email,
        donor_phone: donor.phone ?? null,
        quantity,
        intention: intention ?? null,
        unit_price,
        total_amount: total,
        currency,
        status: "awaiting_3ds",
        provider: "mock_ziraat",
        provider_txn_id: txnId,
        card_meta: { last4, bin, brand, holder: card.holder },
        expires_at,
      })
      .select("id")
      .single();

    if (insErr || !order) {
      console.error("insert error:", insErr);
      return new Response(JSON.stringify({ responseCode: "500", responseMessage: "Failed to create order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const threeDSUrl = `/payment/3ds-mock?orderId=${order.id}&txn=${txnId}`;

    return new Response(
      JSON.stringify({
        responseCode: "00",
        responseMessage: "Approved",
        order_id: order.id,
        transactionId: txnId,
        threeDSUrl,
        amount: total,
        currency,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ responseCode: "500", responseMessage: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
