import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function RequireAdmin({
  children,
  roles = ["admin", "moderator", "viewer"],
}: {
  children: React.ReactNode;
  roles?: AppRole[];
}) {
  const { user, roles: userRoles, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;
  const allowed = userRoles.some((r) => roles.includes(r));
  if (!allowed)
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-bold">صلاحيات غير كافية</h1>
          <p className="text-sm text-muted-foreground">
            هذا الحساب ليس لديه الصلاحيات المطلوبة. اطلب من المسؤول منحك دوراً مناسباً.
          </p>
        </div>
      </div>
    );
  return <>{children}</>;
}
