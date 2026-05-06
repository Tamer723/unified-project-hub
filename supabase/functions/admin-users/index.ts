import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const VALID_ROLES = ["admin", "moderator", "viewer"] as const;
type Role = typeof VALID_ROLES[number];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any = null;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    const { action, user_id, role, email, redirectTo } = body ?? {};

    if (req.method === "POST" && action) {
      // grant role
      if (action === "grant_role" && user_id && VALID_ROLES.includes(role)) {
        const { error } = await admin.from("user_roles").insert({ user_id, role });
        if (error && !error.message.includes("duplicate")) throw error;
        return ok();
      }

      // revoke role
      if (action === "revoke_role" && user_id && VALID_ROLES.includes(role)) {
        // Prevent removing last admin
        if (role === "admin") {
          const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
          if ((admins?.length ?? 0) <= 1) {
            return new Response(JSON.stringify({ error: "لا يمكن إزالة آخر مسؤول" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        const { error } = await admin.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
        if (error) throw error;
        return ok();
      }

      // invite user
      if (action === "invite_user" && email && VALID_ROLES.includes(role)) {
        const { data: invited, error: iErr } = await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo: redirectTo ?? undefined,
        });
        if (iErr) throw iErr;
        const newId = invited?.user?.id;
        if (newId) {
          const { error: rErr } = await admin.from("user_roles").insert({ user_id: newId, role });
          if (rErr && !rErr.message.includes("duplicate")) throw rErr;
        }
        return ok({ user_id: newId });
      }

      // legacy aliases
      if (action === "grant_admin" && user_id) {
        const { error } = await admin.from("user_roles").insert({ user_id, role: "admin" });
        if (error && !error.message.includes("duplicate")) throw error;
        return ok();
      }
      if (action === "revoke_admin" && user_id) {
        const { error } = await admin.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
        if (error) throw error;
        return ok();
      }

      return new Response(JSON.stringify({ error: "invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // list users
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
    if (listErr) throw listErr;
    const { data: roles } = await admin.from("user_roles").select("user_id, role");
    const rolesByUser = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });

    const users = list.users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      roles: rolesByUser.get(u.id) ?? [],
    }));

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function ok(extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ ok: true, ...extra }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
