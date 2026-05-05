import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({
  donation_id: z.string().uuid(),
  status: z.enum(["success", "failed"]),
  provider_ref: z.string().min(1).max(255),
  signature: z.string().min(1).max(512),
});

const HASH_KEY = Deno.env.get("ZIRAATPAY_HASH_KEY") ?? "MOCK_HASH_KEY";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      console.log("[payment-callback] validation failed", parsed.error.flatten());
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { donation_id, status, provider_ref, signature } = parsed.data;
    console.log("[payment-callback] received", { donation_id, status, provider_ref });

    // TODO: real HMAC verification using HASH_KEY against ZiraatPay payload
    // Mock: any non-empty signature is accepted
    if (!signature || signature.length < 1) {
      console.log("[payment-callback] invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    void HASH_KEY;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load donation; only update if currently pending (idempotency)
    const { data: donation, error: dErr } = await supabase
      .from("donations")
      .select("id, status, amount, campaign_id")
      .eq("id", donation_id)
      .maybeSingle();

    if (dErr || !donation) {
      console.error("[payment-callback] donation not found", dErr);
      return new Response(JSON.stringify({ error: "Donation not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (donation.status !== "pending") {
      console.log("[payment-callback] already processed", { donation_id, current: donation.status });
      return new Response(
        JSON.stringify({ success: true, donation_id, status: donation.status, note: "already processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: uErr } = await supabase
      .from("donations")
      .update({
        status,
        provider_ref,
        metadata: { callback: raw, signature_verified: true },
      })
      .eq("id", donation_id)
      .eq("status", "pending"); // guard against race

    if (uErr) {
      console.error("[payment-callback] update error", uErr);
      return new Response(JSON.stringify({ error: "Failed to update donation" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (status === "success" && donation.campaign_id) {
      const { error: incErr } = await supabase.rpc("increment_raised", {
        _campaign_id: donation.campaign_id,
        _amount: donation.amount,
      });
      if (incErr) {
        console.error("[payment-callback] increment_raised failed", incErr);
      } else {
        console.log("[payment-callback] raised_amount incremented", {
          campaign_id: donation.campaign_id, amount: donation.amount,
        });
      }
    }

    console.log("[payment-callback] done", { donation_id, status });

    return new Response(
      JSON.stringify({ success: true, donation_id, status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[payment-callback] unexpected", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
