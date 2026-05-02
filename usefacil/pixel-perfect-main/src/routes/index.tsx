import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Wallet,
  ArrowRight,
  ArrowLeftRight,
  TrendingUp,
  Users,
  FileBarChart,
  ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CaixaSimples — Controle de caixa simples e direto" },
      {
        name: "description",
        content:
          "Lançamentos, fluxo de caixa, fiado e relatórios em uma plataforma feita para o seu negócio.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: ArrowLeftRight,
    title: "Lançamentos rápidos",
    desc: "Registre entradas e saídas em segundos.",
  },
  { icon: TrendingUp, title: "Fluxo de caixa", desc: "Veja o saldo do dia, semana e mês." },
  { icon: Users, title: "Controle de fiado", desc: "Acompanhe quem deve e o que já pagou." },
  { icon: FileBarChart, title: "Relatórios claros", desc: "Exporte e analise seu desempenho." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shadow-primary">
              <Wallet className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">CaixaSimples</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Criar conta</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-semibold mb-6">
          <ShieldCheck className="w-3.5 h-3.5" />
          Seguro e fácil de usar
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 max-w-3xl mx-auto">
          Controle o caixa do seu negócio <span className="text-primary">sem complicação</span>.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          O CaixaSimples reúne lançamentos, fluxo de caixa, fiado e relatórios em uma plataforma
          direta, pensada para quem precisa organizar o financeiro sem perder tempo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/auth">
            <Button size="lg" className="w-full sm:w-auto">
              Começar agora <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="p-6 shadow-card hover:shadow-elevated transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CaixaSimples
      </footer>
    </div>
  );
}
