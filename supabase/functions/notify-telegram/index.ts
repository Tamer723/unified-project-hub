import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sendTelegram(chatId: string, text: string) {
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

  const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const data = await r.json();
  if (!r.ok || data.ok === false) throw new Error(`Telegram [${r.status}]: ${JSON.stringify(data)}`);
  return data;
}

const STATUS_LABEL: Record<string, string> = {
  paid: "✅ توكيل ناجح",
  success: "✅ توكيل ناجح",
  failed: "❌ فشل التوكيل",
  cancelled: "🚫 تم الإلغاء",
  expired: "⌛ منتهي الصلاحية",
  awaiting_3ds: "🔐 بانتظار التحقق",
  pending: "⏳ قيد الانتظار",
};

const COUNTRY_FLAGS: Record<string, string> = {
  SY: "🇸🇾", TR: "🇹🇷", SO: "🇸🇴", YE: "🇾🇪", PS: "🇵🇸", SD: "🇸🇩",
};
const COUNTRY_AR: Record<string, string> = {
  SY: "سوريا", TR: "تركيا", SO: "الصومال", YE: "اليمن", PS: "فلسطين", SD: "السودان",
};
const ANIMAL_AR: Record<string, string> = {
  sheep: "🐏 خروف",
  goat: "🐐 ماعز",
  cow_share: "🐄 سهم بقرة",
  cow_full: "🐄 بقرة كاملة",
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function isoFlag(code?: string | null): string {
  if (!code || code.length !== 2) return "";
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function isAuthorizedCaller(req: Request): Promise<boolean> {
  // Allow internal callers (DB trigger) via shared secret
  const internal = req.headers.get("x-internal-secret");
  const expected = Deno.env.get("INTERNAL_NOTIFY_SECRET");
  if (expected && internal && timingSafeEqual(internal, expected)) return true;

  // Otherwise require an admin JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: claims, error } = await supabase.auth.getClaims(token);
  if (error || !claims?.claims?.sub) return false;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: roleRow } = await admin
    .from("user_roles").select("role")
    .eq("user_id", claims.claims.sub).eq("role", "admin").maybeSingle();
  return !!roleRow;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!(await isAuthorizedCaller(req))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatId = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");
    if (!chatId) {
      return new Response(JSON.stringify({ error: "TELEGRAM_ADMIN_CHAT_ID is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));

    // Test message
    if (body.test) {
      await sendTelegram(chatId, "🔔 <b>رسالة تجريبية</b>\nالاتصال بتلغرام يعمل بشكل صحيح.");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderId = body.order_id;
    if (!orderId) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error } = await supabase
      .from("orders")
      .select("*, products(title_ar, code), product_price_matrix(country_code, animal_code)")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      return new Response(JSON.stringify({ error: "order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = (body.status as string) || order.status;
    const header = STATUS_LABEL[status] ?? `🔔 تحديث (${status})`;
    const shortId = String(order.id).slice(0, 8).toUpperCase();
    const product = (order as any).products?.title_ar || (order as any).products?.code || "—";
    const matrix = (order as any).product_price_matrix;
    const country = matrix?.country_code
      ? `${COUNTRY_FLAGS[matrix.country_code] ?? ""} ${COUNTRY_AR[matrix.country_code] ?? matrix.country_code}`
      : null;
    const animal = matrix?.animal_code ? ANIMAL_AR[matrix.animal_code] ?? matrix.animal_code : null;

    const lines: string[] = [];
    lines.push(`<b>${header}</b> — <code>#${shortId}</code>`);
    lines.push(`👤 <b>${escapeHtml(order.donor_name)}</b>`);
    lines.push(`📧 ${escapeHtml(order.donor_email)}`);
    if (order.donor_phone) lines.push(`📞 ${escapeHtml(order.donor_phone)}`);
    lines.push(`📦 ${escapeHtml(product)}`);
    if (country) lines.push(`🌍 ${country}`);
    if (animal) lines.push(`${animal}`);
    lines.push(`💰 ${order.unit_price} ${order.currency} × ${order.quantity} = <b>${order.total_amount} ${order.currency}</b>`);
    if (order.intention) lines.push(`📝 ${escapeHtml(order.intention)}`);
    if (order.failure_reason) lines.push(`⚠️ ${escapeHtml(order.failure_reason)}`);
    if ((order as any).donor_country || (order as any).donor_ip) {
      const dc = (order as any).donor_country;
      const dip = (order as any).donor_ip;
      lines.push(`📡 ${dc ? `${isoFlag(dc)} ${dc}` : ""}${dip ? `  <code>${escapeHtml(dip)}</code>` : ""}`.trim());
    }
    lines.push(`🕐 ${new Date().toLocaleString("ar-SY", { timeZone: "Europe/Istanbul" })}`);

    await sendTelegram(chatId, lines.join("\n"));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-telegram error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
