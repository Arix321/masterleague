import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLUB_LIST, type ClubSlug } from "@/data/clubs";
import { createCareer } from "@/lib/career";
import { toast } from "sonner";
import { ArrowLeft, Check } from "lucide-react";

export const Route = createFileRoute("/carreiras/nova")({
  component: NewCareerPage,
});

function NewCareerPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [managerName, setManagerName] = useState("");
  const [selected, setSelected] = useState<ClubSlug | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
    if (user && !managerName) {
      const meta = (user.user_metadata?.manager_name as string | undefined) ?? user.email?.split("@")[0] ?? "";
      setManagerName(meta);
    }
  }, [loading, user, navigate, managerName]);

  if (!user) return null;

  const handleStart = async () => {
    if (!selected || !managerName.trim()) {
      toast.error("Preencha seu nome e escolha um clube.");
      return;
    }
    setBusy(true);
    try {
      const career = await createCareer({ userId: user.id, managerName: managerName.trim(), clubSlug: selected });
      toast.success("Clube selecionado! Prepare seu elenco.");
      navigate({ to: "/carreira/$careerId/preparacao", params: { careerId: career.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar carreira");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/carreiras"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link>
          </Button>
          <h1 className="text-xl font-bold">Nova carreira</h1>
          <div />
        </div>
      </header>

      <section className="container mx-auto px-6 py-10">
        <Card className="mx-auto mb-8 max-w-xl border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle>Quem é o técnico?</CardTitle>
            <CardDescription>Esse nome aparecerá nas manchetes e coletivas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="mname">Nome do técnico</Label>
            <Input id="mname" value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Ex: Abel Ferreira" />
          </CardContent>
        </Card>

        <h2 className="mb-4 text-center text-2xl font-bold">Escolha seu clube</h2>
        <p className="mb-8 text-center text-muted-foreground">Os outros 5 clubes serão seus rivais e o mercado.</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CLUB_LIST.map((club) => {
            const isSel = selected === club.slug;
            return (
              <button
                key={club.slug}
                type="button"
                onClick={() => setSelected(club.slug)}
                className={`group relative overflow-hidden rounded-xl border bg-card/70 p-5 text-left transition hover:border-primary/60 hover:shadow-glow ${
                  isSel ? "border-primary shadow-glow ring-2 ring-primary/40" : "border-border/60"
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-gold" />
                {isSel && (
                  <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </span>
                )}
                <div className="mb-3 text-5xl">{club.badge}</div>
                <h3 className="text-xl font-bold">{club.name}</h3>
                <p className="text-sm text-muted-foreground">{club.flag} {club.league}</p>
                <p className="mt-2 text-xs text-muted-foreground">Orçamento: €{(club.budgetEur / 1_000_000).toFixed(0)}M</p>
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <Button size="lg" disabled={busy || !selected} onClick={handleStart}>
            {busy ? "Iniciando..." : "Iniciar carreira"}
          </Button>
        </div>
      </section>
    </main>
  );
}