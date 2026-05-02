import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

interface LockedFeatureProps {
  title: string;
  description?: string;
}

export function LockedFeature({ title, description }: LockedFeatureProps) {
  const navigate = useNavigate();
  return (
    <Card className="p-8 sm:p-12 text-center border-dashed">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Lock className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        {description ??
          "Seu acesso ainda não foi liberado. Realize o pagamento para usar todas as funções."}
      </p>
      <Button onClick={() => navigate({ to: "/dashboard" })} variant="default">
        Ver opções de liberação
      </Button>
    </Card>
  );
}
