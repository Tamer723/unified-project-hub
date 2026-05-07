import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function escapeV3(v: unknown): string {
  return String(v ?? "").replaceAll("\\", "\\\\").replaceAll("|", "\\|");
}
async function hashV3(params: Record<string, string>, storeKey: string): Promise<string> {
  // For RESPONSE: also exclude 'countdown' per docs
  const exclude = new Set(["hash", "encoding", "countdown"]);
  const keys = Object.keys(params)
    .filter((k) => !exclude.has(k.toLowerCase()))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const plaintext = keys.map((k) => escapeV3(params[k])).join("|") + "|" + escapeV3(storeKey);
  const buf = new TextEncoder().encode(plaintext);
  const digest = await crypto.subtle.digest("SHA-512", buf);
  return encodeBase64(new Uint8Array(digest));
}

const ALLOWED_ORIGINS = [
  "https://campaign.4c.studio",
];

function safeOriginFrom(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    const host = u.host;
    if (ALLOWED_ORIGINS.includes(`${u.protocol}//${host}`)) return `${u.protocol}//${host}`;
  } catch { /* ignore */ }
  return null;
}

function siteOrigin(req: Request, queryOrigin: string | null, metaOrigin: string | null): string {
  return safeOriginFrom(queryOrigin)
    || safeOriginFrom(metaOrigin)
    || Deno.env.get("PUBLIC_SITE_URL")
    || "https://campaign.4c.studio";
}

function redirect(url: string): Response {
  // HTML breakout redirect — works whether the callback is rendered inside a 3DS
  // iframe (iyzico) or a full page (NestPay/Ziraat hosted). Uses window.top to
  // escape the iframe; falls back to window.location and <meta refresh>.
  const safe = url.replace(/"/g, "&quot;");
  const jsUrl = JSON.stringify(url);
  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Redirecting…</title>
<meta http-equiv="refresh" content="0;url=${safe}">
<script>
(function(){
  try { (window.top || window).location.replace(${jsUrl}); }
  catch (e) { window.location.replace(${jsUrl}); }
})();
</script></head>
<body style="font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:2rem">
<p>جارٍ التحويل… / Redirecting…</p>
<p><a href="${safe}" target="_top">اضغط هنا للمتابعة</a></p>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Read lang/origin from URL query (set when we built the callbackUrl)
  const reqUrl = new URL(req.url);
  const queryLang = reqUrl.searchParams.get("lang");
  const queryOrigin = reqUrl.searchParams.get("o");
  let lang: "ar" | "tr" | "en" | null =
    queryLang === "ar" || queryLang === "tr" || queryLang === "en" ? queryLang : null;
  let origin = siteOrigin(req, queryOrigin, null);

  function appendLang(url: string): string {
    if (!lang) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}lang=${lang}`;
  }

  try {
    // Parse body: NestPay sends application/x-www-form-urlencoded
    const ct = req.headers.get("content-type") || "";
    let params: Record<string, string> = {};
    if (req.method === "POST") {
      if (ct.includes("application/json")) {
        const j = await req.json();
        for (const [k, v] of Object.entries(j)) params[k] = String(v ?? "");
      } else {
        const text = await req.text();
        const sp = new URLSearchParams(text);
        for (const [k, v] of sp.entries()) params[k] = v;
      }
    } else {
      const u = new URL(req.url);
      for (const [k, v] of u.searchParams.entries()) params[k] = v;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ===== Detect iyzico callback =====
    // iyzico checkout sends: token, conversationId(=order.id)
    // iyzico 3DS sends: paymentId, conversationData, conversationId, status, mdStatus
    const iyzToken = params.token || "";
    const iyzPaymentId = params.paymentId || "";
    let iyzConvId = params.conversationId || "";
    const isIyzico = !!(iyzToken || iyzPaymentId);

    if (isIyzico) {
      const iyzApiKey = Deno.env.get("IYZICO_API_KEY");
      const iyzSecret = Deno.env.get("IYZICO_SECRET_KEY");

      // Resolve order id by token when conversationId is absent (iyzico checkout often omits it)
      if (!iyzConvId && iyzToken) {
        const { data: byRef } = await supabase.from("orders")
          .select("id").eq("provider_ref", iyzToken).maybeSingle();
        if (byRef) iyzConvId = byRef.id;
      }
      if (!iyzConvId) {
        console.error("iyzico callback: cannot resolve order", params);
        return redirect(appendLang(`${origin}/failed?reason=order_not_found`));
      }

      const { data: ordRow } = await supabase.from("orders")
        .select("id, status, provider, metadata").eq("id", iyzConvId).maybeSingle();
      if (!ordRow) return redirect(appendLang(`${origin}/failed?reason=order_not_found`));

      // Override origin/lang from order metadata if not provided in URL
      const meta = (ordRow.metadata ?? {}) as { lang?: string; origin?: string };
      if (!queryLang && (meta.lang === "ar" || meta.lang === "tr" || meta.lang === "en")) lang = meta.lang;
      if (!queryOrigin && meta.origin) {
        const safe = safeOriginFrom(meta.origin);
        if (safe) origin = safe;
      }

      if (ordRow.status === "paid" || ordRow.status === "failed") {
        return redirect(appendLang(`${origin}/${ordRow.status === "paid" ? "success" : "failed"}?order=${iyzConvId}`));
      }

      if (!iyzApiKey || !iyzSecret) {
        return redirect(appendLang(`${origin}/failed?reason=iyzico_not_configured`));
      }

      // Determine env from settings
      const { data: ps } = await supabase.from("payment_settings").select("test_mode").maybeSingle();
      const iyzBase = (ps?.test_mode ?? true) ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com";

      let path = "";
      let body: Record<string, unknown> = {};
      const iyzLocale = lang === "tr" ? "tr" : "en";
      if (iyzToken) {
        path = "/payment/iyzipos/checkoutform/auth/ecom/detail/";
        body = { locale: iyzLocale, conversationId: iyzConvId, token: iyzToken };
      } else {
        path = "/payment/3dsecure/auth";
        body = { locale: iyzLocale, conversationId: iyzConvId, paymentId: iyzPaymentId, conversationData: params.conversationData || "" };
      }
      const bodyStr = JSON.stringify(body);
      const randomKey = `${Date.now()}${Math.floor(Math.random() * 1e9)}`;
      const payload = randomKey + path + bodyStr;
      const keyData = new TextEncoder().encode(iyzSecret);
      const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(payload));
      const sigHex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
      const authStr = `apiKey:${iyzApiKey}&randomKey:${randomKey}&signature:${sigHex}`;
      const authHeader = "IYZWSv2 " + encodeBase64(new TextEncoder().encode(authStr));

      const r = await fetch(`${iyzBase}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": authHeader, "x-iyzi-rnd": randomKey },
        body: bodyStr,
      });
      const j = await r.json();
      console.log("iyzico verify:", JSON.stringify(j));

      const ok = j.status === "success" && (j.paymentStatus === "SUCCESS" || j.paymentStatus === undefined && j.status === "success");
      const finalStatus = ok ? "paid" : "failed";
      const reason = ok ? null : (j.errorMessage || `iyzico verify failed (${j.status})`);

      const prevMeta = (ordRow.metadata ?? {}) as Record<string, unknown>;
      await supabase.from("orders").update({
        status: finalStatus,
        failure_reason: reason,
        provider_txn_id: j.paymentId || iyzPaymentId || null,
        metadata: { ...prevMeta, iyzico_verify: j, processed_at: new Date().toISOString() },
      }).eq("id", iyzConvId).in("status", ["pending", "awaiting_3ds"]);

      return redirect(appendLang(`${origin}/${ok ? "success" : "failed"}?order=${iyzConvId}${ok ? "" : `&reason=${encodeURIComponent(reason || "failed")}`}`));
    }

    // ===== NestPay callback (existing logic) =====
    const oid = params.oid || params.OrderId || params.orderid || "";
    if (!oid) {
      console.error("callback: missing oid", params);
      return redirect(appendLang(`${origin}/failed?reason=missing_oid`));
    }

    // Hash verification (only if storeKey configured AND HASH present)
    const storeKey = Deno.env.get("NESTPAY_STORE_KEY");
    const receivedHash = params.HASH || params.hash || "";
    let hashOk = false;
    if (storeKey && receivedHash) {
      const computed = await hashV3(params, storeKey);
      hashOk = computed === receivedHash;
      if (!hashOk) {
        console.error("callback: hash mismatch", { oid, computed, receivedHash });
      }
    }

    const mdStatus = params.mdStatus || "";
    const procReturnCode = params.ProcReturnCode || params.procreturncode || "";
    const responseStr = params.Response || params.response || "";
    const authCode = params.AuthCode || params.authcode || "";
    const errMsg = params.ErrMsg || params.errmsg || params.mdErrorMsg || "";

    const threeDsOk = ["1", "2", "3", "4"].includes(mdStatus);
    const authOk = procReturnCode === "00" || /approved/i.test(responseStr);

    let finalStatus: "paid" | "failed" = "failed";
    let failureReason: string | null = null;

    if (storeKey && receivedHash && !hashOk) {
      failureReason = "Hash mismatch";
    } else if (!threeDsOk) {
      failureReason = errMsg || `3DS failed (mdStatus=${mdStatus})`;
    } else if (!authOk) {
      failureReason = errMsg || `Auth declined (${procReturnCode})`;
    } else {
      finalStatus = "paid";
    }

    // Idempotent update
    const { data: order } = await supabase.from("orders")
      .select("id, status").eq("id", oid).maybeSingle();
    if (!order) {
      console.error("callback: order not found", oid);
      return redirect(appendLang(`${origin}/failed?reason=order_not_found`));
    }
    if (order.status === "paid" || order.status === "failed") {
      return redirect(appendLang(`${origin}/${order.status === "paid" ? "success" : "failed"}`));
    }

    await supabase.from("orders").update({
      status: finalStatus,
      failure_reason: failureReason,
      provider_ref: authCode || params.TransId || params.transid || null,
      metadata: { callback: params, processed_at: new Date().toISOString() },
    }).eq("id", oid).in("status", ["pending", "awaiting_3ds"]);

    if (finalStatus === "paid") {
      return redirect(appendLang(`${origin}/success?order=${oid}`));
    }
    return redirect(appendLang(`${origin}/failed?reason=${encodeURIComponent(failureReason || "failed")}`));

  } catch (err) {
    console.error("callback error:", (err as Error).message);
    return redirect(appendLang(`${origin}/failed?reason=internal_error`));
  }
});
