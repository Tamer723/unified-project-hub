import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "moderator" | "viewer";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = (uid: string) =>
      setTimeout(async () => {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        setRoles((data ?? []).map((r: any) => r.role as AppRole));
        setLoading(false);
      }, 0);

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setRoles([]);
        setLoading(false);
      } else {
        fetchRoles(s.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setRoles([]);
        setLoading(false);
      } else {
        fetchRoles(s.user.id);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator");
  const isViewer = roles.includes("viewer");
  const hasStaffAccess = isAdmin || isModerator || isViewer;
  const canManageContent = isAdmin || isModerator;

  return { session, user, roles, isAdmin, isModerator, isViewer, hasStaffAccess, canManageContent, loading };
}
