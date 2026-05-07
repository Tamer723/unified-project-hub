import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Body = z.object({
  order_id: z.string().uuid(),
  otp: z.string().regex(/^\d{6}$/),
  nonce: z.string().min(16).max(128),
});

// Constant-time string compare
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
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
      return new Response(JSON.stringify({ approved: false, responseCode: "400", responseMessage: "Invalid input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { order_id, otp, nonce } = parsed.data;

    const { data: order } = await supabase
      .from("orders")
      .select("id, status, provider, metadata")
      .eq("id", order_id)
      .maybeSingle();

    if (!order) {
      return new Response(JSON.stringify({ approved: false, responseCode: "404", responseMessage: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.provider !== "mock") {
      return new Response(JSON.stringify({ approved: false, responseCode: "403", responseMessage: "Not a mock order" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.status !== "awaiting_3ds") {
      return new Response(JSON.stringify({ approved: false, responseCode: "409", responseMessage: `Order is '${order.status}'` }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate per-order nonce (issued at payment-init time)
    const expectedNonce = (order.metadata as { mock_nonce?: string } | null)?.mock_nonce;
    if (!expectedNonce || !timingSafeEqual(expectedNonce, nonce)) {
      return new Response(JSON.stringify({ approved: false, responseCode: "401", responseMessage: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Per-order rate limiting: max 5 attempts
    const prevMeta = (order.metadata ?? {}) as Record<string, unknown>;
    const attempts = Number(prevMeta.mock_attempts ?? 0) + 1;
    if (attempts > 5) {
      await supabase.from("orders")
        .update({ status: "failed", failure_reason: "too_many_attempts" })
        .eq("id", order_id).eq("status", "awaiting_3ds");
      return new Response(JSON.stringify({ approved: false, responseCode: "429", responseMessage: "Too many attempts" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await supabase.from("orders")
      .update({ metadata: { ...prevMeta, mock_attempts: attempts } })
      .eq("id", order_id);

    if (otp === "123456") {
      const authCode = Math.floor(100000 + Math.random() * 900000).toString();
      // Invalidate nonce after success
      const { mock_nonce: _n, ...metaWithoutNonce } = prevMeta as Record<string, unknown>;
      await supabase.from("orders")
        .update({ status: "paid", failure_reason: null, provider_ref: authCode, metadata: { ...metaWithoutNonce, mock_attempts: attempts } })
        .eq("id", order_id).eq("status", "awaiting_3ds");
      return new Response(JSON.stringify({ approved: true, responseCode: "00", responseMessage: "Approved", authCode }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const reason = otp === "000000" ? "insufficient_funds" : "otp_mismatch";
    const code = otp === "000000" ? "51" : "82";
    const message = otp === "000000" ? "Insufficient funds" : "3D Secure authentication failed";

    await supabase.from("orders")
      .update({ status: "failed", failure_reason: reason })
      .eq("id", order_id).eq("status", "awaiting_3ds");

    return new Response(JSON.stringify({ approved: false, responseCode: code, responseMessage: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("mock-verify:", (err as Error).message);
    return new Response(JSON.stringify({ approved: false, responseCode: "500", responseMessage: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
