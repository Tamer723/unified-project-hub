import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin)
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-bold">صلاحيات غير كافية</h1>
          <p className="text-sm text-muted-foreground">
            هذا الحساب ليس لديه دور مسؤول. اطلب من مسؤول النظام منحك صلاحية admin.
          </p>
        </div>
      </div>
    );
  return <>{children}</>;
}
