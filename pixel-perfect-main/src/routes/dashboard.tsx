import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/RouteGuards";
import { ArrowDown, ArrowUp, Wallet, Lock, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { fmtBRL } from "@/lib/format";

const PAYMENT_URL = "https://go.perfectpay.com.br/PPU38CQBCAK";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — CaixaSimples" }],
  }),
  component: () => (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  ),
});

function Dashboard() {
  const { profile, isActive, refreshProfile } = useAuth();
  const [resumo, setResumo] = useState({ entradas: 0, saidas: 0, saldo: 0 });

  useEffect(() => {
    if (!isActive) return;
    (async () => {
      const inicio = new Date();
      inicio.setDate(1);
      const { data } = await supabase
        .from("lancamentos")
        .select("tipo, valor")
        .gte("data", inicio.toISOString().slice(0, 10));
      const entradas = (data ?? [])
        .filter((l) => l.tipo === "entrada")
        .reduce((s, l) => s + Number(l.valor), 0);
      const saidas = (data ?? [])
        .filter((l) => l.tipo === "saida")
        .reduce((s, l) => s + Number(l.valor), 0);
      setResumo({ entradas, saidas, saldo: entradas - saidas });
    })();
  }, [isActive]);

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Olá, {profile?.nome?.split(" ")[0] || "bem-vindo"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {isActive
            ? "Aqui está o resumo do seu caixa neste mês."
            : "Realize o pagamento para liberar todas as funções."}
        </p>
      </div>

      {!isActive && (
        <BloqueioCard
          onPagamentoFeito={() => toast.success("Seu pagamento será analisado em breve.")}
          onRefresh={refreshProfile}
        />
      )}

      {isActive && (
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <ResumoCard label="Entradas no mês" value={fmtBRL(resumo.entradas)} icon={ArrowUp} color="primary" />
          <ResumoCard label="Saídas no mês" value={fmtBRL(resumo.saidas)} icon={ArrowDown} color="destructive" />
          <ResumoCard label="Saldo" value={fmtBRL(resumo.saldo)} icon={Wallet} color="secondary" />
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <AtalhoCard to="/lancamentos" label="Lançamentos" locked={!isActive} />
        <AtalhoCard to="/fluxo" label="Fluxo de caixa" locked={!isActive} />
        <AtalhoCard to="/fiado" label="Fiado" locked={!isActive} />
        <AtalhoCard to="/relatorios" label="Relatórios" locked={!isActive} />
      </div>
    </AppLayout>
  );
}

function ResumoCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "primary" | "secondary" | "destructive";
}) {
  const bg =
    color === "primary"
      ? "bg-primary-soft text-primary"
      : color === "secondary"
      ? "bg-secondary-soft text-secondary"
      : "bg-destructive/10 text-destructive";
  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}

function AtalhoCard({
  to,
  label,
  locked,
}: {
  to: "/lancamentos" | "/fluxo" | "/fiado" | "/relatorios";
  label: string;
  locked: boolean;
}) {
  return (
    <Link
      to={to}
      className="block p-5 rounded-xl bg-card border border-border shadow-card hover:shadow-elevated transition-shadow"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">{label}</span>
        {locked && <Lock className="w-4 h-4 text-muted-foreground" />}
      </div>
    </Link>
  );
}

function BloqueioCard({
  onPagamentoFeito,
  onRefresh,
}: {
  onPagamentoFeito: () => void;
  onRefresh: () => void;
}) {
  return (
    <Card className="p-6 sm:p-8 mb-8 border-warning/30 bg-warning/5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-1">Acesso ainda não liberado</h2>
          <p className="text-muted-foreground mb-4">
            Realize o pagamento para usar todas as funções do CaixaSimples.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <a href={PAYMENT_URL} target="_blank" rel="noopener noreferrer">
              <Button className="w-full sm:w-auto">
                Realizar pagamento <ExternalLink className="w-4 h-4 ml-1" />
              </Button>
            </a>
            <Button variant="outline" onClick={onPagamentoFeito}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Já realizei o pagamento
            </Button>
            <Button variant="ghost" onClick={onRefresh}>
              Verificar liberação
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
