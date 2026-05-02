import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { AdminRoute } from "@/components/RouteGuards";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Search, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fmtDataHora } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Painel Admin — CaixaSimples" }] }),
  component: () => (
    <AdminRoute>
      <Admin />
    </AdminRoute>
  ),
});

type Profile = {
  id: string;
  nome: string;
  email: string;
  status: "pending_payment" | "active" | "blocked";
  created_at: string;
};

const ADMIN_EMAIL = "jp14lopes07@gmail.com";

function Admin() {
  const { profile: me } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todos" | "pendentes" | "liberados">("todos");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar usuários");
    setProfiles((data ?? []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (p: Profile, novo: "active" | "pending_payment") => {
    if (p.email.toLowerCase() === ADMIN_EMAIL) {
      return toast.error("Não é possível alterar o administrador principal.");
    }
    setBusyId(p.id);
    const { error } = await supabase.from("profiles").update({ status: novo }).eq("id", p.id);
    setBusyId(null);
    if (error) return toast.error("Erro ao atualizar usuário");
    toast.success(novo === "active" ? "Usuário liberado com sucesso" : "Usuário bloqueado");
    load();
  };

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (filter === "pendentes" && p.status === "active") return false;
      if (filter === "liberados" && p.status !== "active") return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.nome.toLowerCase().includes(q) && !p.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [profiles, filter, search]);

  const stats = useMemo(
    () => ({
      total: profiles.length,
      pendentes: profiles.filter((p) => p.status !== "active").length,
      liberados: profiles.filter((p) => p.status === "active").length,
    }),
    [profiles]
  );

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center text-secondary-foreground">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Painel do Desenvolvedor</h1>
          <p className="text-muted-foreground text-sm">Conectado como {me?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{stats.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Pendentes</div><div className="text-2xl font-bold text-warning">{stats.pendentes}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Liberados</div><div className="text-2xl font-bold text-primary">{stats.liberados}</div></Card>
      </div>

      <Card className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
              <TabsTrigger value="liberados">Liberados</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">Nenhum usuário encontrado.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((p) => {
              const isMainAdmin = p.email.toLowerCase() === ADMIN_EMAIL;
              return (
                <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{p.nome || "(sem nome)"}</span>
                      {isMainAdmin && (
                        <Badge className="gradient-secondary text-secondary-foreground border-0">
                          Admin
                        </Badge>
                      )}
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="text-sm text-muted-foreground">{p.email}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Cadastrado em {fmtDataHora(p.created_at)}
                    </div>
                  </div>
                  {!isMainAdmin && (
                    <div className="flex gap-2">
                      {p.status !== "active" ? (
                        <Button size="sm" onClick={() => setStatus(p, "active")} disabled={busyId === p.id}>
                          {busyId === p.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Liberar acesso
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(p, "pending_payment")}
                          disabled={busyId === p.id}
                        >
                          {busyId === p.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Lock className="w-4 h-4 mr-1" /> Bloquear acesso
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </AppLayout>
  );
}

function StatusBadge({ status }: { status: Profile["status"] }) {
  if (status === "active")
    return <Badge className="bg-primary text-primary-foreground border-0">Liberado</Badge>;
  if (status === "blocked") return <Badge variant="destructive">Bloqueado</Badge>;
  return (
    <Badge variant="secondary" className="bg-warning/15 text-warning border-warning/20">
      Pendente
    </Badge>
  );
}
