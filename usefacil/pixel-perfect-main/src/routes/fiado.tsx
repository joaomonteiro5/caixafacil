import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { LockedFeature } from "@/components/LockedFeature";
import { ProtectedRoute } from "@/components/RouteGuards";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { fmtBRL, fmtData } from "@/lib/format";

export const Route = createFileRoute("/fiado")({
  head: () => ({ meta: [{ title: "Fiado — CaixaSimples" }] }),
  component: () => (
    <ProtectedRoute>
      <FiadoPage />
    </ProtectedRoute>
  ),
});

type Fiado = {
  id: string;
  cliente: string;
  descricao: string;
  valor: number;
  valor_pago: number;
  vencimento: string | null;
  status: "em_aberto" | "pago" | "atrasado";
  created_at: string;
};

function FiadoPage() {
  const { isActive, user } = useAuth();
  const [items, setItems] = useState<Fiado[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("fiados").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Fiado[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isActive) load();
  }, [isActive]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      cliente: String(fd.get("cliente") || "").trim(),
      descricao: String(fd.get("descricao") || "").trim(),
      valor: Number(fd.get("valor") || 0),
      vencimento: (fd.get("vencimento") as string) || null,
      user_id: user!.id,
    };
    if (!payload.cliente || !payload.descricao || payload.valor <= 0) {
      return toast.error("Preencha cliente, descrição e valor.");
    }
    const { error } = await supabase.from("fiados").insert([payload]);
    if (error) return toast.error("Erro ao adicionar");
    toast.success("Fiado registrado");
    setOpen(false);
    load();
  };

  const marcarPago = async (f: Fiado) => {
    const { error } = await supabase.from("fiados").update({ valor_pago: f.valor, status: "pago" }).eq("id", f.id);
    if (error) return toast.error("Erro ao atualizar");
    toast.success("Marcado como pago");
    load();
  };

  const remover = async (id: string) => {
    if (!confirm("Excluir este fiado?")) return;
    const { error } = await supabase.from("fiados").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Excluído");
    load();
  };

  if (!isActive) {
    return (
      <AppLayout>
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Fiado</h1>
        <LockedFeature title="Controle de fiado bloqueado" />
      </AppLayout>
    );
  }

  const totalAberto = items
    .filter((f) => f.status !== "pago")
    .reduce((s, f) => s + (Number(f.valor) - Number(f.valor_pago)), 0);

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Fiado</h1>
          <p className="text-muted-foreground mt-1">
            Total em aberto:{" "}
            <strong className="text-foreground">{fmtBRL(totalAberto)}</strong>
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-1" /> Novo fiado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo fiado</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cliente">Cliente</Label>
                <Input id="cliente" name="cliente" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="descricao">Descrição</Label>
                <Input id="descricao" name="descricao" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="valor">Valor (R$)</Label>
                  <Input id="valor" name="valor" type="number" step="0.01" min="0.01" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vencimento">Vencimento</Label>
                  <Input id="vencimento" name="vencimento" type="date" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Adicionar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">Nenhum fiado registrado.</div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((f) => (
              <div key={f.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{f.cliente}</div>
                  <div className="text-sm text-muted-foreground truncate">{f.descricao}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-2 flex-wrap items-center">
                    {f.vencimento && <span>Vence em {fmtData(f.vencimento)}</span>}
                    <Badge
                      variant={
                        f.status === "pago"
                          ? "default"
                          : f.status === "atrasado"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {f.status === "pago"
                        ? "Pago"
                        : f.status === "atrasado"
                        ? "Atrasado"
                        : "Em aberto"}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{fmtBRL(Number(f.valor))}</div>
                  {f.status !== "pago" && Number(f.valor_pago) > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Pago: {fmtBRL(Number(f.valor_pago))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  {f.status !== "pago" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => marcarPago(f)}
                      title="Marcar como pago"
                    >
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => remover(f.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
