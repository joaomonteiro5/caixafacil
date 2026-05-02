import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  Users,
  FileBarChart,
  LogOut,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/lancamentos", label: "Lançamentos", icon: ArrowLeftRight },
  { to: "/fluxo", label: "Fluxo de caixa", icon: TrendingUp },
  { to: "/fiado", label: "Fiado", icon: Users },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-64 flex-col border-r border-border bg-card">
        <div className="p-6 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shadow-primary">
              <Wallet className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold text-foreground leading-tight">CaixaSimples</div>
              <div className="text-xs text-muted-foreground">Controle de caixa</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-card"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-4 border-t border-border pt-4",
                location.pathname === "/admin"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-secondary hover:bg-muted"
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              Painel Admin
            </Link>
          )}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <div className="px-3 py-2">
            <div className="text-sm font-medium truncate">{profile?.nome}</div>
            <div className="text-xs text-muted-foreground truncate">{profile?.email}</div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="flex-1 justify-start" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between p-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">CaixaSimples</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <nav className="flex overflow-x-auto gap-1 px-2 pb-2">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground bg-muted"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap",
                location.pathname === "/admin"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-secondary bg-muted"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </Link>
          )}
        </nav>
      </header>

      <main className="lg:ml-64 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">{children}</main>
    </div>
  );
}
