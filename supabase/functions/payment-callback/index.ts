import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { encode as encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

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
    try { const u = new URL(ref); return `${u.protocol}//${u.host}`; } catch { /* ignore */ }
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

    const oid = params.oid || params.OrderId || params.orderid || "";
    if (!oid) {
      console.error("callback: missing oid", params);
      return redirect(`${origin}/failed?reason=missing_oid`);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
      // Already processed → just redirect to the corresponding page
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
