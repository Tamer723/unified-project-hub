import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Body = z.object({
  order_id: z.string().uuid(),
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

    const { order_id, card } = parsed.data;
    const digits = card.number.replace(/\D/g, "");
    const last4 = digits.slice(-4);
    const bin = digits.slice(0, 6);
    const brand = detectBrand(digits);

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("id, status, total_amount, currency")
      .eq("id", order_id)
      .single();

    if (oErr || !order) {
      return new Response(JSON.stringify({ responseCode: "404", responseMessage: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status !== "pending") {
      return new Response(JSON.stringify({ responseCode: "409", responseMessage: `Order is in '${order.status}' state` }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const txnId = `MOCK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const { error: uErr } = await supabase
      .from("orders")
      .update({
        status: "awaiting_3ds",
        provider: "mock_ziraat",
        provider_txn_id: txnId,
        card_meta: { last4, bin, brand, holder: card.holder },
      })
      .eq("id", order_id);

    if (uErr) {
      console.error("update error:", uErr);
      return new Response(JSON.stringify({ responseCode: "500", responseMessage: "Failed to update order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const threeDSUrl = `/payment/3ds-mock?orderId=${order_id}&txn=${txnId}`;

    return new Response(
      JSON.stringify({
        responseCode: "00",
        responseMessage: "Approved",
        transactionId: txnId,
        threeDSUrl,
        amount: order.total_amount,
        currency: order.currency,
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
