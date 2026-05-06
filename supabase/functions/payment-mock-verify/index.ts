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
});

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
    const { order_id, otp } = parsed.data;

    const { data: order } = await supabase
      .from("orders")
      .select("id, status, provider")
      .eq("id", order_id)
      .maybeSingle();

    if (!order) {
      return new Response(JSON.stringify({ approved: false, responseCode: "404", responseMessage: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Only mock orders allowed here
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

    if (otp === "123456") {
      const authCode = Math.floor(100000 + Math.random() * 900000).toString();
      await supabase.from("orders")
        .update({ status: "paid", failure_reason: null, provider_ref: authCode })
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
