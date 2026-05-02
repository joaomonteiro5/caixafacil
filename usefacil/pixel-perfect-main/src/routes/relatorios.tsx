import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { LockedFeature } from "@/components/LockedFeature";
import { ProtectedRoute } from "@/components/RouteGuards";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { fmtBRL, fmtData } from "@/lib/format";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — CaixaSimples" }] }),
  component: () => (
    <ProtectedRoute>
      <Relatorios />
    </ProtectedRoute>
  ),
});

type Lanc = {
  id: string;
  descricao: string;
  valor: number;
  tipo: "entrada" | "saida";
  categoria: string;
  metodo_pagamento: string;
  data: string;
};

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function Relatorios() {
  const { isActive } = useAuth();
  const [items, setItems] = useState<Lanc[]>([]);

  useEffect(() => {
    if (!isActive) return;
    supabase
      .from("lancamentos")
      .select("*")
      .order("data", { ascending: false })
      .then(({ data }) => setItems((data ?? []) as Lanc[]));
  }, [isActive]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    items
      .filter((i) => i.tipo === "saida")
      .forEach((i) => {
        map.set(i.categoria, (map.get(i.categoria) ?? 0) + Number(i.valor));
      });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [items]);

  const exportCSV = () => {
    if (items.length === 0) return toast.error("Nada para exportar");
    const header = ["Data", "Tipo", "Descrição", "Categoria", "Pagamento", "Valor"].join(";");
    const rows = items.map((l) =>
      [
        fmtData(l.data),
        l.tipo,
        l.descricao.replace(/;/g, ","),
        l.categoria,
        l.metodo_pagamento,
        Number(l.valor).toFixed(2).replace(".", ","),
      ].join(";")
    );
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `caixasimples-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado com sucesso");
  };

  if (!isActive) {
    return (
      <AppLayout>
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Relatórios</h1>
        <LockedFeature title="Relatórios bloqueados" />
      </AppLayout>
    );
  }

  const totalEntrada = items.filter((i) => i.tipo === "entrada").reduce((s, i) => s + Number(i.valor), 0);
  const totalSaida = items.filter((i) => i.tipo === "saida").reduce((s, i) => s + Number(i.valor), 0);

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Visão geral dos seus lançamentos.</p>
        </div>
        <Button onClick={exportCSV} variant="outline">
          <Download className="w-4 h-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="text-sm text-muted-foreground">Total de entradas</div><div className="text-2xl font-bold text-primary">{fmtBRL(totalEntrada)}</div></Card>
        <Card className="p-5"><div className="text-sm text-muted-foreground">Total de saídas</div><div className="text-2xl font-bold text-destructive">{fmtBRL(totalSaida)}</div></Card>
        <Card className="p-5"><div className="text-sm text-muted-foreground">Lançamentos</div><div className="text-2xl font-bold">{items.length}</div></Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Saídas por categoria</h3>
        {porCategoria.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sem saídas registradas ainda.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porCategoria} dataKey="value" nameKey="name" outerRadius={100} label={(e: { name?: string }) => e.name ?? ""}>
                  {porCategoria.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtBRL(Number(v))} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
