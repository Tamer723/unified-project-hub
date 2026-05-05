import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({
  campaign_id: z.string().uuid(),
  donor_name: z.string().trim().min(1).max(100),
  donor_email: z.string().trim().email().max(255),
  donor_phone: z.string().trim().max(30).optional().nullable(),
  amount: z.number().int().positive().max(100_000_000), // in cents
  currency: z.enum(["USD", "TRY", "EUR"]),
});

// ZiraatPay config — defaults for dev, override via secrets later
const MERCHANT_ID = Deno.env.get("ZIRAATPAY_MERCHANT_ID") ?? "MOCK_MERCHANT";
const TERMINAL_ID = Deno.env.get("ZIRAATPAY_TERMINAL_ID") ?? "MOCK_TERMINAL";
const HASH_KEY = Deno.env.get("ZIRAATPAY_HASH_KEY") ?? "MOCK_HASH_KEY";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      console.log("[create-payment] validation failed", parsed.error.flatten());
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { campaign_id, donor_name, donor_email, donor_phone, amount, currency } = parsed.data;
    console.log("[create-payment] start", { campaign_id, amount, currency });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify campaign exists and is active
    const { data: campaign, error: cErr } = await supabase
      .from("campaigns")
      .select("id, active, currency")
      .eq("id", campaign_id)
      .maybeSingle();

    if (cErr) {
      console.error("[create-payment] campaign lookup error", cErr);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!campaign || !campaign.active) {
      console.log("[create-payment] campaign not found or inactive", campaign_id);
      return new Response(JSON.stringify({ error: "Campaign not found or inactive" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Insert pending donation
    const { data: donation, error: dErr } = await supabase
      .from("donations")
      .insert({
        campaign_id,
        donor_name,
        donor_email,
        donor_phone: donor_phone ?? null,
        amount,
        currency,
        status: "pending",
        expires_at: expiresAt,
        metadata: { merchant_id: MERCHANT_ID, terminal_id: TERMINAL_ID },
      })
      .select("id")
      .single();

    if (dErr || !donation) {
      console.error("[create-payment] insert error", dErr);
      return new Response(JSON.stringify({ error: "Failed to create donation" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TODO: integrate real ZiraatPay using HASH_KEY for HMAC signing
    const paymentUrl = `https://mock-payment.test/pay?ref=${donation.id}`;

    await supabase
      .from("donations")
      .update({ payment_url: paymentUrl })
      .eq("id", donation.id);

    console.log("[create-payment] success", { donation_id: donation.id });

    return new Response(
      JSON.stringify({ donation_id: donation.id, payment_url: paymentUrl, expires_at: expiresAt }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[create-payment] unexpected", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
