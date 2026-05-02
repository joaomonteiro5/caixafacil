import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Wallet, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — CaixaSimples" },
      { name: "description", content: "Acesse sua conta CaixaSimples ou crie uma nova." },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  senha: z.string().min(6, "Senha precisa ter ao menos 6 caracteres").max(72),
});
const signInSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  senha: z.string().min(1, "Informe a senha"),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("login");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  const onSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({ email: fd.get("email"), senha: fd.get("senha") });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.senha,
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message
      );
      return;
    }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard", replace: true });
  };

  const onSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      nome: fd.get("nome"),
      email: fd.get("email"),
      senha: fd.get("senha"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.senha,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { nome: parsed.data.nome },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.message.includes("already registered")
          ? "Este email já está cadastrado"
          : error.message
      );
      return;
    }
    toast.success("Conta criada! Faça login para continuar.");
    setTab("login");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="lg:w-1/2 gradient-primary p-8 lg:p-16 flex flex-col justify-between text-primary-foreground">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 w-fit">
            <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold">CaixaSimples</span>
          </Link>
          <ThemeToggle className="text-primary-foreground hover:bg-white/20" />
        </div>
        <div className="hidden lg:block">
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight mb-4">
            Controle o caixa do seu negócio sem complicação.
          </h1>
          <p className="text-lg text-white/90 max-w-md">
            Lançamentos, fluxo de caixa, fiado e relatórios em uma plataforma simples e direta.
          </p>
        </div>
        <p className="text-sm text-white/70">© CaixaSimples</p>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background">
        <Card className="w-full max-w-md p-6 sm:p-8 shadow-elevated">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <h2 className="text-2xl font-bold mb-1">Acesse sua conta</h2>
              <p className="text-sm text-muted-foreground mb-6">Entre com seu email e senha.</p>
              <form onSubmit={onSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" name="email" type="email" placeholder="voce@exemplo.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-senha">Senha</Label>
                  <Input id="login-senha" name="senha" type="password" placeholder="••••••" required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <h2 className="text-2xl font-bold mb-1">Crie sua conta</h2>
              <p className="text-sm text-muted-foreground mb-6">
                O acesso completo é liberado após confirmação do pagamento.
              </p>
              <form onSubmit={onSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-nome">Nome</Label>
                  <Input id="signup-nome" name="nome" placeholder="Seu nome" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" name="email" type="email" placeholder="voce@exemplo.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-senha">Senha</Label>
                  <Input id="signup-senha" name="senha" type="password" placeholder="Mínimo 6 caracteres" required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
