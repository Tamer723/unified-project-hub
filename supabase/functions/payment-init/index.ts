import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";
const DEFAULT_NESTPAY_HOST_TEST = "https://entegrasyon.asseco-see.com.tr/fim/est3Dgate";
const DEFAULT_NESTPAY_HOST_PROD = "https://sanalposprov.ziraatbank.com.tr/fim/est3Dgate";

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
  }).optional(),
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
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const j = await r.json();
    return j.success === true;
  } catch (e) { console.error("turnstile:", e); return false; }
}

// NestPay Hash V3: SHA-512(plaintext) -> base64
// plaintext = sorted(params, alpha case-insensitive).map(escape).join("|") + "|" + escape(storeKey)
// escape: '\' -> '\\' then '|' -> '\|'
function escapeV3(v: unknown): string {
  return String(v ?? "").replaceAll("\\", "\\\\").replaceAll("|", "\\|");
}
async function hashV3(params: Record<string, string>, storeKey: string): Promise<string> {
  const keys = Object.keys(params)
    .filter((k) => !["hash", "encoding"].includes(k.toLowerCase()))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const plaintext = keys.map((k) => escapeV3(params[k])).join("|") + "|" + escapeV3(storeKey);
  const buf = new TextEncoder().encode(plaintext);
  const digest = await crypto.subtle.digest("SHA-512", buf);
  return encodeBase64(new Uint8Array(digest));
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
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { donor, intention, quantity, currency, product_id, matrix_id, track_code, track_country, track_animal, card, captchaToken } = parsed.data;

    // CAPTCHA
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    if (!(await verifyTurnstile(captchaToken, ip))) {
      return new Response(JSON.stringify({ responseCode: "403", responseMessage: "CAPTCHA verification failed" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Active provider
    const { data: settings } = await supabase
      .from("payment_settings").select("active_provider, test_mode").limit(1).maybeSingle();
    const activeProvider = (settings?.active_provider ?? "mock") as "mock" | "nestpay_3d" | "nestpay_hosting" | "iyzico_checkout" | "iyzico_3ds";
    const testMode = settings?.test_mode ?? true;

    // Card required for mock + nestpay_3d + iyzico_3ds, NOT for hosted flows
    const hostedFlow = activeProvider === "nestpay_hosting" || activeProvider === "iyzico_checkout";
    const needsCard = !hostedFlow;
    if (needsCard && !card) {
      return new Response(JSON.stringify({ responseCode: "400", responseMessage: "Card required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let last4 = "0000", bin = "000000", brand = "unknown";
    if (card) {
      const digits = card.number.replace(/\D/g, "");
      if (!luhnOk(digits)) {
        return new Response(JSON.stringify({ responseCode: "400", responseMessage: "Invalid card number" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      last4 = digits.slice(-4); bin = digits.slice(0, 6); brand = detectBrand(digits);
    }

    // Server-side price resolution
    let resolvedProduct: string | null = product_id ?? null;
    if (!resolvedProduct && !matrix_id && track_code) {
      const { data: tp } = await supabase.from("products").select("id").eq("code", track_code).eq("active", true).maybeSingle();
      resolvedProduct = tp?.id ?? null;
      if (!resolvedProduct) {
        return new Response(JSON.stringify({ responseCode: "400", responseMessage: `Unknown track: ${track_code}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    let serverUnitPrice: number | null = null;
    let serverCurrency: string = currency;
    let resolvedMatrixId: string | null = matrix_id ?? null;

    if (matrix_id) {
      const { data: m } = await supabase.from("product_price_matrix")
        .select("price, currency, product_id, active").eq("id", matrix_id).eq("active", true).maybeSingle();
      if (!m) return new Response(JSON.stringify({ responseCode: "400", responseMessage: "Invalid pricing" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      serverUnitPrice = m.price; serverCurrency = m.currency; resolvedProduct = m.product_id;
    } else {
      if (resolvedProduct && track_country && track_animal) {
        const { data: mrow } = await supabase.from("product_price_matrix")
          .select("id, price, currency, product_id")
          .eq("product_id", resolvedProduct).eq("country_code", track_country)
          .eq("animal_code", track_animal).eq("active", true).maybeSingle();
        if (mrow) { serverUnitPrice = mrow.price; serverCurrency = mrow.currency; resolvedMatrixId = mrow.id; }
      }
      if (serverUnitPrice == null) {
        if (!resolvedProduct) return new Response(JSON.stringify({ responseCode: "400", responseMessage: "Product is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
        const { data: prod } = await supabase.from("products")
          .select("base_price, currency, active, code").eq("id", resolvedProduct).eq("active", true).maybeSingle();
        if (!prod || !prod.code) return new Response(JSON.stringify({ responseCode: "400", responseMessage: "Product unavailable" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
        serverUnitPrice = prod.base_price; serverCurrency = prod.currency;
      }
    }

    const USD_TO_TRY = 45;
    if (currency === "TRY" && serverCurrency === "USD") { serverUnitPrice = Math.round(serverUnitPrice! * USD_TO_TRY); serverCurrency = "TRY"; }
    else if (currency === "USD" && serverCurrency === "TRY") { serverUnitPrice = Math.round(serverUnitPrice! / USD_TO_TRY); serverCurrency = "USD"; }

    const total = serverUnitPrice! * quantity;
    const expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const txnId = `${activeProvider.toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const { data: order, error: insErr } = await supabase.from("orders").insert({
      product_id: resolvedProduct, matrix_id: resolvedMatrixId,
      donor_name: donor.name, donor_email: donor.email, donor_phone: donor.phone ?? null,
      quantity, intention: intention ?? null,
      unit_price: serverUnitPrice, total_amount: total, currency: serverCurrency,
      status: activeProvider === "mock" ? "awaiting_3ds" : "pending",
      provider: activeProvider, provider_txn_id: txnId,
      card_meta: card ? { last4, bin, brand, holder: card.holder } : null,
      expires_at,
    }).select("id").single();

    if (insErr || !order) {
      console.error("insert:", insErr?.message);
      return new Response(JSON.stringify({ responseCode: "500", responseMessage: "Failed to create order" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== MOCK =====
    if (activeProvider === "mock") {
      const threeDSUrl = `/payment/3ds-mock?orderId=${order.id}&txn=${txnId}`;
      return new Response(JSON.stringify({
        responseCode: "00", responseMessage: "Approved",
        mode: "internal_3ds",
        order_id: order.id, transactionId: txnId, threeDSUrl,
        amount: total, currency: serverCurrency, last4,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== IYZICO (Checkout Form OR 3DS) =====
    if (activeProvider === "iyzico_checkout" || activeProvider === "iyzico_3ds") {
      const iyzApiKey = Deno.env.get("IYZICO_API_KEY");
      const iyzSecret = Deno.env.get("IYZICO_SECRET_KEY");
      if (!iyzApiKey || !iyzSecret) {
        await supabase.from("orders").update({
          status: "failed", failure_reason: "iyzico credentials not configured",
        }).eq("id", order.id);
        return new Response(JSON.stringify({
          responseCode: "503", responseMessage: "iyzico not configured. Add IYZICO_API_KEY and IYZICO_SECRET_KEY secrets.",
        }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const iyzBase = testMode ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com";
      const callbackBase = `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-callback`;
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "85.34.78.112";
      const priceStr = total.toFixed(2);
      const iyzCurrency = serverCurrency === "TRY" ? "TRY" : serverCurrency === "USD" ? "USD" : "TRY";

      const buyer = {
        id: order.id,
        name: donor.name.split(" ")[0] || donor.name,
        surname: donor.name.split(" ").slice(1).join(" ") || donor.name,
        gsmNumber: donor.phone || "+905350000000",
        email: donor.email,
        identityNumber: "11111111111",
        registrationAddress: "N/A",
        ip,
        city: "Istanbul",
        country: "Turkey",
      };
      const address = { contactName: donor.name, city: "Istanbul", country: "Turkey", address: "N/A" };
      const basketItems = [{
        id: resolvedProduct || order.id,
        name: intention || "Donation",
        category1: "Donation",
        itemType: "VIRTUAL",
        price: priceStr,
      }];

      const reqBody: Record<string, unknown> = {
        locale: "tr",
        conversationId: order.id,
        price: priceStr,
        paidPrice: priceStr,
        currency: iyzCurrency,
        basketId: order.id,
        paymentGroup: "PRODUCT",
        callbackUrl: callbackBase,
        buyer,
        shippingAddress: address,
        billingAddress: address,
        basketItems,
      };

      let path = "";
      if (activeProvider === "iyzico_checkout") {
        path = "/payment/iyzipay/checkoutform/initialize/auth/ecom";
      } else {
        // 3DS — needs card
        path = "/payment/3dsecure/initialize";
        const digits = card!.number.replace(/\D/g, "");
        reqBody.paymentChannel = "WEB";
        reqBody.paymentCard = {
          cardHolderName: card!.holder || donor.name,
          cardNumber: digits,
          expireMonth: String(card!.expMonth).padStart(2, "0"),
          expireYear: String(card!.expYear),
          cvc: card!.cvc,
          registerCard: 0,
        };
      }

      const bodyStr = JSON.stringify(reqBody);
      const randomKey = `${Date.now()}${Math.floor(Math.random() * 1e9)}`;
      // iyzico v2 (IYZWSv2) signature
      const payload = randomKey + path + bodyStr;
      const keyData = new TextEncoder().encode(iyzSecret);
      const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(payload));
      const sigHex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
      const authStr = `apiKey:${iyzApiKey}&randomKey:${randomKey}&signature:${sigHex}`;
      const authHeader = "IYZWSv2 " + encodeBase64(new TextEncoder().encode(authStr));

      const iyzRes = await fetch(`${iyzBase}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
          "x-iyzi-rnd": randomKey,
        },
        body: bodyStr,
      });
      const iyzJson = await iyzRes.json();
      console.log("iyzico init response:", JSON.stringify(iyzJson));

      if (iyzJson.status !== "success") {
        await supabase.from("orders").update({
          status: "failed",
          failure_reason: iyzJson.errorMessage || "iyzico init failed",
        }).eq("id", order.id);
        return new Response(JSON.stringify({
          responseCode: "502",
          responseMessage: iyzJson.errorMessage || "iyzico init failed",
          details: iyzJson,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Save token for callback verification
      await supabase.from("orders").update({
        provider_ref: iyzJson.token || iyzJson.paymentId || null,
        metadata: { iyzico_init: iyzJson },
      }).eq("id", order.id);

      if (activeProvider === "iyzico_checkout") {
        return new Response(JSON.stringify({
          responseCode: "00", responseMessage: "Redirect",
          mode: "redirect_url",
          order_id: order.id, transactionId: txnId,
          action: iyzJson.paymentPageUrl,
          amount: total, currency: serverCurrency, last4,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        // 3DS — return HTML to render in iframe
        const html = atob(iyzJson.threeDSHtmlContent || "");
        return new Response(JSON.stringify({
          responseCode: "00", responseMessage: "3DS",
          mode: "render_html",
          order_id: order.id, transactionId: txnId,
          html,
          amount: total, currency: serverCurrency, last4,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ===== NESTPAY (3D or HOSTING) =====
    const clientId = Deno.env.get("NESTPAY_CLIENT_ID");
    const storeKey = Deno.env.get("NESTPAY_STORE_KEY");
    const hostUrl = testMode
      ? (Deno.env.get("NESTPAY_HOST_URL_TEST") || DEFAULT_NESTPAY_HOST_TEST)
      : (Deno.env.get("NESTPAY_HOST_URL_PROD") || DEFAULT_NESTPAY_HOST_PROD);

    if (!clientId || !storeKey) {
      await supabase.from("orders").update({
        status: "failed", failure_reason: "NestPay credentials not configured",
      }).eq("id", order.id);
      return new Response(JSON.stringify({
        responseCode: "503", responseMessage: "Payment provider not configured. Add NESTPAY_CLIENT_ID and NESTPAY_STORE_KEY secrets.",
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const callbackBase = `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-callback`;
    const currencyCode = serverCurrency === "TRY" ? "949" : serverCurrency === "USD" ? "840" : "949";
    const amountStr = `${total}.00`;
    const rnd = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;

    const fields: Record<string, string> = {
      clientid: clientId,
      oid: order.id,
      amount: amountStr,
      okUrl: callbackBase,
      failUrl: callbackBase,
      callbackUrl: callbackBase,
      rnd,
      currency: currencyCode,
      storetype: activeProvider === "nestpay_hosting" ? "3D_PAY_HOSTING" : "3D",
      hashAlgorithm: "ver3",
      lang: "tr",
      TranType: "Auth",
      Instalment: "",
      refreshtime: "5",
      BillToName: donor.name,
      email: donor.email,
    };

    if (activeProvider === "nestpay_3d" && card) {
      const digits = card.number.replace(/\D/g, "");
      fields.pan = digits;
      fields.Ecom_Payment_Card_ExpDate_Year = String(card.expYear).slice(-2);
      fields.Ecom_Payment_Card_ExpDate_Month = String(card.expMonth).padStart(2, "0");
      fields.cv2 = card.cvc;
      if (card.holder) fields.cardholder = card.holder;
    }

    const hash = await hashV3(fields, storeKey);
    fields.hash = hash;

    return new Response(JSON.stringify({
      responseCode: "00", responseMessage: "Redirect",
      mode: "redirect_post",
      order_id: order.id, transactionId: txnId,
      action: hostUrl, fields,
      amount: total, currency: serverCurrency, last4,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("init:", (err as Error).message);
    return new Response(JSON.stringify({ responseCode: "500", responseMessage: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
