import { Navigate } from "@tanstack/react-router";
import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const ADMIN_EMAIL = "jp14lopes07@gmail.com";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/auth" />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin, profile } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/auth" />;
  const isMainAdmin = isAdmin && profile?.email?.toLowerCase() === ADMIN_EMAIL;
  if (!isMainAdmin) return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
