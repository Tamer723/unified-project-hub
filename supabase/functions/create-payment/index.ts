import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  product_id: z.string().uuid(),
  matrix_id: z.string().uuid().optional().nullable(),
  donor_name: z.string().min(2),
  donor_email: z.string().email(),
  donor_phone: z.string().optional().nullable(),
  quantity: z.number().int().min(1).max(100),
  intention: z.string().optional().nullable(),
  currency: z.enum(["USD", "TRY"]),
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

    const { product_id, matrix_id, donor_name, donor_email,
            donor_phone, quantity, intention, currency } = parsed.data;

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, base_price, pricing_type, active")
      .eq("id", product_id)
      .single();

    if (productError || !product || !product.active) {
      return new Response(
        JSON.stringify({ error: "Product not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let unit_price = product.base_price;

    if (product.pricing_type === "matrix" && matrix_id) {
      const { data: matrix, error: matrixError } = await supabase
        .from("product_price_matrix")
        .select("price, active")
        .eq("id", matrix_id)
        .eq("product_id", product_id)
        .single();

      if (matrixError || !matrix || !matrix.active) {
        return new Response(
          JSON.stringify({ error: "Invalid price option" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      unit_price = matrix.price;
    }

    const total_amount = unit_price * quantity;
    const expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        product_id,
        matrix_id: matrix_id || null,
        donor_name,
        donor_email,
        donor_phone: donor_phone || null,
        quantity,
        intention: intention || null,
        unit_price,
        total_amount,
        currency,
        status: "pending",
        expires_at,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order insert error:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payment_url = `https://mock-payment.test/pay?ref=${order.id}`;

    await supabase
      .from("orders")
      .update({ payment_url })
      .eq("id", order.id);

    console.log("Order created:", order.id, "Amount:", total_amount, currency);

    return new Response(
      JSON.stringify({ order_id: order.id, payment_url, expires_at }),
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
