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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { fmtBRL, fmtData } from "@/lib/format";
import { z } from "zod";

export const Route = createFileRoute("/lancamentos")({
  head: () => ({ meta: [{ title: "Lançamentos — CaixaSimples" }] }),
  component: () => (
    <ProtectedRoute>
      <Lancamentos />
    </ProtectedRoute>
  ),
});

const schema = z.object({
  descricao: z.string().trim().min(1, "Descrição obrigatória").max(120),
  valor: z.number().positive("Valor deve ser maior que zero"),
  tipo: z.enum(["entrada", "saida"]),
  categoria: z.string().trim().min(1).max(40),
  metodo_pagamento: z.string().trim().min(1).max(30),
  data: z.string(),
  observacao: z.string().max(500).optional().nullable(),
});

type Lancamento = {
  id: string;
  descricao: string;
  valor: number;
  tipo: "entrada" | "saida";
  categoria: string;
  metodo_pagamento: string;
  data: string;
  observacao: string | null;
};

const CATEGORIAS = ["Vendas", "Serviços", "Salário", "Compras", "Aluguel", "Contas", "Outros", "Geral"];
const METODOS = ["Dinheiro", "PIX", "Cartão de débito", "Cartão de crédito", "Boleto", "Transferência"];

function Lancamentos() {
  const { isActive, user } = useAuth();
  const [items, setItems] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lancamento | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lancamentos")
      .select("*")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar lançamentos");
    setItems((data ?? []) as Lancamento[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isActive) load();
  }, [isActive]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      descricao: String(fd.get("descricao") || ""),
      valor: Number(fd.get("valor") || 0),
      tipo: String(fd.get("tipo") || "entrada") as "entrada" | "saida",
      categoria: String(fd.get("categoria") || "Geral"),
      metodo_pagamento: String(fd.get("metodo_pagamento") || "Dinheiro"),
      data: String(fd.get("data") || new Date().toISOString().slice(0, 10)),
      observacao: String(fd.get("observacao") || "") || null,
    };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    if (editing) {
      const { error } = await supabase.from("lancamentos").update(parsed.data).eq("id", editing.id);
      if (error) return toast.error("Erro ao salvar");
      toast.success("Lançamento atualizado");
    } else {
      const { error } = await supabase.from("lancamentos").insert([
        { ...parsed.data, observacao: parsed.data.observacao ?? null, user_id: user!.id },
      ]);
      if (error) return toast.error("Erro ao adicionar");
      toast.success("Lançamento adicionado");
    }
    setOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este lançamento?")) return;
    const { error } = await supabase.from("lancamentos").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Lançamento excluído");
    load();
  };

  if (!isActive) {
    return (
      <AppLayout>
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Lançamentos</h1>
        <LockedFeature title="Lançamentos bloqueados" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Lançamentos</h1>
          <p className="text-muted-foreground mt-1">Registre entradas e saídas do seu caixa.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-1" /> Novo lançamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input id="descricao" name="descricao" defaultValue={editing?.descricao} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="valor">Valor (R$)</Label>
                  <Input id="valor" name="valor" type="number" step="0.01" min="0.01" defaultValue={editing?.valor} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select name="tipo" defaultValue={editing?.tipo ?? "entrada"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select name="categoria" defaultValue={editing?.categoria ?? "Geral"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="metodo_pagamento">Pagamento</Label>
                  <Select name="metodo_pagamento" defaultValue={editing?.metodo_pagamento ?? "Dinheiro"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {METODOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="data">Data</Label>
                  <Input id="data" name="data" type="date" defaultValue={editing?.data ?? new Date().toISOString().slice(0, 10)} required />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="observacao">Observação</Label>
                  <Textarea id="observacao" name="observacao" defaultValue={editing?.observacao ?? ""} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">{editing ? "Salvar" : "Adicionar"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhum lançamento ainda.</p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar o primeiro
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((l) => (
              <div key={l.id} className="flex items-center gap-3 p-4 hover:bg-muted/40">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    l.tipo === "entrada" ? "bg-primary-soft text-primary" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {l.tipo === "entrada" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{l.descricao}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-1.5 mt-0.5">
                    <Badge variant="secondary" className="font-normal">{l.categoria}</Badge>
                    <span>{l.metodo_pagamento}</span>
                    <span>•</span>
                    <span>{fmtData(l.data)}</span>
                  </div>
                </div>
                <div className={`text-right font-semibold ${l.tipo === "entrada" ? "text-primary" : "text-destructive"}`}>
                  {l.tipo === "entrada" ? "+" : "−"} {fmtBRL(Number(l.valor))}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(l); setOpen(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(l.id)}>
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
