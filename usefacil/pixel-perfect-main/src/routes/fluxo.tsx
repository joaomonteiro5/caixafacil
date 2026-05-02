import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { LockedFeature } from "@/components/LockedFeature";
import { ProtectedRoute } from "@/components/RouteGuards";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { fmtBRL } from "@/lib/format";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export const Route = createFileRoute("/fluxo")({
  head: () => ({ meta: [{ title: "Fluxo de caixa — CaixaSimples" }] }),
  component: () => (
    <ProtectedRoute>
      <Fluxo />
    </ProtectedRoute>
  ),
});

type Lanc = { tipo: "entrada" | "saida"; valor: number; data: string };

function Fluxo() {
  const { isActive } = useAuth();
  const [items, setItems] = useState<Lanc[]>([]);

  useEffect(() => {
    if (!isActive) return;
    const ini = new Date();
    ini.setDate(ini.getDate() - 29);
    supabase
      .from("lancamentos")
      .select("tipo, valor, data")
      .gte("data", ini.toISOString().slice(0, 10))
      .then(({ data }) => setItems((data ?? []) as Lanc[]));
  }, [isActive]);

  const chartData = useMemo(() => {
    const map = new Map<string, { data: string; entradas: number; saidas: number; saldo: number }>();
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { data: key.slice(8, 10) + "/" + key.slice(5, 7), entradas: 0, saidas: 0, saldo: 0 });
    }
    items.forEach((l) => {
      const e = map.get(l.data);
      if (!e) return;
      if (l.tipo === "entrada") e.entradas += Number(l.valor);
      else e.saidas += Number(l.valor);
    });
    let acc = 0;
    return Array.from(map.values()).map((e) => {
      acc += e.entradas - e.saidas;
      return { ...e, saldo: acc };
    });
  }, [items]);

  if (!isActive) {
    return (
      <AppLayout>
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Fluxo de caixa</h1>
        <LockedFeature title="Fluxo de caixa bloqueado" />
      </AppLayout>
    );
  }

  const totalEntradas = chartData.reduce((s, e) => s + e.entradas, 0);
  const totalSaidas = chartData.reduce((s, e) => s + e.saidas, 0);

  return (
    <AppLayout>
      <h1 className="text-2xl sm:text-3xl font-bold mb-1">Fluxo de caixa</h1>
      <p className="text-muted-foreground mb-6">Últimos 30 dias</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="text-sm text-muted-foreground">Entradas</div><div className="text-2xl font-bold text-primary">{fmtBRL(totalEntradas)}</div></Card>
        <Card className="p-5"><div className="text-sm text-muted-foreground">Saídas</div><div className="text-2xl font-bold text-destructive">{fmtBRL(totalSaidas)}</div></Card>
        <Card className="p-5"><div className="text-sm text-muted-foreground">Saldo</div><div className="text-2xl font-bold text-secondary">{fmtBRL(totalEntradas - totalSaidas)}</div></Card>
      </div>

      <Card className="p-5 mb-6">
        <h3 className="font-semibold mb-4">Saldo acumulado</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="data" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v) => fmtBRL(Number(v))} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="saldo" stroke="var(--secondary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Entradas vs Saídas por dia</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="data" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip formatter={(v) => fmtBRL(Number(v))} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="entradas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </AppLayout>
  );
}
