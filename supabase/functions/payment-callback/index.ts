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

function siteOrigin(req: Request): string {
  // Prefer Origin/Referer if present, else fall back to a configured site URL or hardcoded.
  const ref = req.headers.get("referer");
  if (ref) {
    try {
      const u = new URL(ref);
      // Ignore referers from payment providers (iyzico, nestpay, etc.) — use site URL instead
      const isProvider = /iyzipay|iyzico|asseco|ziraat|nestpay/i.test(u.host);
      if (!isProvider) return `${u.protocol}//${u.host}`;
    } catch { /* ignore */ }
  }
  return Deno.env.get("PUBLIC_SITE_URL") || "https://campaign.4c.studio";
}

function redirect(url: string): Response {
  return new Response(null, { status: 302, headers: { ...corsHeaders, Location: url } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const origin = siteOrigin(req);

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
        return redirect(`${origin}/failed?reason=order_not_found`);
      }

      const { data: ordRow } = await supabase.from("orders")
        .select("id, status, provider").eq("id", iyzConvId).maybeSingle();
      if (!ordRow) return redirect(`${origin}/failed?reason=order_not_found`);
      if (ordRow.status === "paid" || ordRow.status === "failed") {
        return redirect(`${origin}/${ordRow.status === "paid" ? "success" : "failed"}?order=${iyzConvId}`);
      }

      if (!iyzApiKey || !iyzSecret) {
        return redirect(`${origin}/failed?reason=iyzico_not_configured`);
      }

      // Determine env from settings
      const { data: ps } = await supabase.from("payment_settings").select("test_mode").maybeSingle();
      const iyzBase = (ps?.test_mode ?? true) ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com";

      let path = "";
      let body: Record<string, unknown> = {};
      if (iyzToken) {
        path = "/payment/iyzipos/checkoutform/auth/ecom/detail/";
        body = { locale: "tr", conversationId: iyzConvId, token: iyzToken };
      } else {
        path = "/payment/3dsecure/auth";
        body = { locale: "tr", conversationId: iyzConvId, paymentId: iyzPaymentId, conversationData: params.conversationData || "" };
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

      await supabase.from("orders").update({
        status: finalStatus,
        failure_reason: reason,
        provider_txn_id: j.paymentId || iyzPaymentId || null,
        metadata: { iyzico_verify: j, processed_at: new Date().toISOString() },
      }).eq("id", iyzConvId).in("status", ["pending", "awaiting_3ds"]);

      return redirect(`${origin}/${ok ? "success" : "failed"}?order=${iyzConvId}${ok ? "" : `&reason=${encodeURIComponent(reason || "failed")}`}`);
    }

    // ===== NestPay callback (existing logic) =====
    const oid = params.oid || params.OrderId || params.orderid || "";
    if (!oid) {
      console.error("callback: missing oid", params);
      return redirect(`${origin}/failed?reason=missing_oid`);
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
      return redirect(`${origin}/failed?reason=order_not_found`);
    }
    if (order.status === "paid" || order.status === "failed") {
      return redirect(`${origin}/${order.status === "paid" ? "success" : "failed"}`);
    }

    await supabase.from("orders").update({
      status: finalStatus,
      failure_reason: failureReason,
      provider_ref: authCode || params.TransId || params.transid || null,
      metadata: { callback: params, processed_at: new Date().toISOString() },
    }).eq("id", oid).in("status", ["pending", "awaiting_3ds"]);

    if (finalStatus === "paid") {
      return redirect(`${origin}/success?order=${oid}`);
    }
    return redirect(`${origin}/failed?reason=${encodeURIComponent(failureReason || "failed")}`);

  } catch (err) {
    console.error("callback error:", (err as Error).message);
    return redirect(`${origin}/failed?reason=internal_error`);
  }
});
