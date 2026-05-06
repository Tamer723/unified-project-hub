import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Cloudflare Turnstile test secret key (always passes). Replace via TURNSTILE_SECRET_KEY env var for production.
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

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
  track_code: z.string().max(40).optional().nullable(),
  track_country: z.string().max(8).optional().nullable(),
  track_animal: z.string().max(40).optional().nullable(),
  captchaToken: z.string().min(1).max(2048),
  card: z.object({
    number: z.string().min(13).max(25),
    holder: z.string().max(80).optional().default(""),
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

function luhnOk(d: string): boolean {
  let sum = 0, dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = parseInt(d[i], 10);
    if (dbl) { n *= 2; if (n > 9) n -= 9; }
    sum += n; dbl = !dbl;
  }
  return sum % 10 === 0;
}

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY") || TURNSTILE_TEST_SECRET;
  const form = new URLSearchParams();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const j = await r.json();
    return j.success === true;
  } catch (e) {
    console.error("turnstile verify failed:", e);
    return false;
  }
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

    const { donor, intention, quantity, currency, product_id, matrix_id, track_code, track_country, track_animal, card, captchaToken } = parsed.data;

    // 1. CAPTCHA verification
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const captchaOk = await verifyTurnstile(captchaToken, ip);
    if (!captchaOk) {
      return new Response(JSON.stringify({ responseCode: "403", responseMessage: "CAPTCHA verification failed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Card validation (Luhn)
    const digits = card.number.replace(/\D/g, "");
    if (!luhnOk(digits)) {
      return new Response(JSON.stringify({ responseCode: "400", responseMessage: "Invalid card number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const last4 = digits.slice(-4);
    const bin = digits.slice(0, 6);
    const brand = detectBrand(digits);

    // 3. Server-side price resolution (NEVER trust client unit_price)
    let resolvedProduct: string | null = product_id ?? null;
    if (!resolvedProduct && !matrix_id && track_code) {
      const { data: tp } = await supabase
        .from("products")
        .select("id")
        .eq("code", track_code)
        .eq("active", true)
        .maybeSingle();
      resolvedProduct = tp?.id ?? null;
      if (!resolvedProduct) {
        return new Response(JSON.stringify({ responseCode: "400", responseMessage: `Unknown track: ${track_code}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    let serverUnitPrice: number | null = null;
    let serverCurrency: string = currency;
    let resolvedMatrixId: string | null = matrix_id ?? null;

    if (matrix_id) {
      const { data: m } = await supabase
        .from("product_price_matrix")
        .select("price, currency, product_id, active")
        .eq("id", matrix_id)
        .eq("active", true)
        .maybeSingle();
      if (!m) {
        return new Response(JSON.stringify({ responseCode: "400", responseMessage: "Invalid pricing" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      serverUnitPrice = m.price;
      serverCurrency = m.currency;
      resolvedProduct = m.product_id;
    } else {
      // If track is matrix-priced and country/animal provided, find matrix row
      if (resolvedProduct && track_country && track_animal) {
        const { data: mrow } = await supabase
          .from("product_price_matrix")
          .select("id, price, currency, product_id")
          .eq("product_id", resolvedProduct)
          .eq("country_code", track_country)
          .eq("animal_code", track_animal)
          .eq("active", true)
          .maybeSingle();
        if (mrow) {
          serverUnitPrice = mrow.price;
          serverCurrency = mrow.currency;
          resolvedMatrixId = mrow.id;
        }
      }
      if (serverUnitPrice == null) {
        if (!resolvedProduct) {
          return new Response(JSON.stringify({ responseCode: "400", responseMessage: "Product is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: prod } = await supabase
          .from("products")
          .select("base_price, currency, active, code")
          .eq("id", resolvedProduct)
          .eq("active", true)
          .maybeSingle();
        if (!prod || !prod.code) {
          return new Response(JSON.stringify({ responseCode: "400", responseMessage: "Product unavailable" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        serverUnitPrice = prod.base_price;
        serverCurrency = prod.currency;
      }
    }

    // Currency conversion: DB stores USD; if client requests TRY, convert.
    const USD_TO_TRY = 45;
    if (currency === "TRY" && serverCurrency === "USD") {
      serverUnitPrice = Math.round(serverUnitPrice! * USD_TO_TRY);
      serverCurrency = "TRY";
    } else if (currency === "USD" && serverCurrency === "TRY") {
      serverUnitPrice = Math.round(serverUnitPrice! / USD_TO_TRY);
      serverCurrency = "USD";
    }

    const txnId = `MOCK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const total = serverUnitPrice! * quantity;
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
        unit_price: serverUnitPrice,
        total_amount: total,
        currency: serverCurrency,
        status: "awaiting_3ds",
        provider: "mock_ziraat",
        provider_txn_id: txnId,
        card_meta: { last4, bin, brand, holder: card.holder },
        expires_at,
      })
      .select("id")
      .single();

    if (insErr || !order) {
      console.error("insert error:", insErr?.message);
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
        currency: serverCurrency,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("init error:", (err as Error).message);
    return new Response(JSON.stringify({ responseCode: "500", responseMessage: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
