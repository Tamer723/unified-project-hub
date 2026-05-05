import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(["success", "failed"]),
  provider_ref: z.string().min(1),
  signature: z.string().min(1),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { order_id, status, provider_ref, signature } = parsed.data;

    // TODO: HMAC verification with ZIRAATPAY_HASH_KEY
    console.log("Signature (mock):", signature);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, total_amount, product_id")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.status !== "pending") {
      return new Response(
        JSON.stringify({ success: true, order_id, status: order.status, note: "Already processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status,
        provider_ref,
        metadata: { ...body, processed_at: new Date().toISOString() },
      })
      .eq("id", order_id)
      .eq("status", "pending");

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Order updated:", order_id, "Status:", status);

    return new Response(
      JSON.stringify({ success: true, order_id, status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
