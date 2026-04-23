import { createFileRoute, Link, useNavigate, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CLUBS, type ClubSlug } from "@/data/clubs";
import { Trash2, Plus, LogOut } from "lucide-react";
import { deleteCareer } from "@/lib/career";
import { toast } from "sonner";

export const Route = createFileRoute("/carreiras")({
  component: CareersPage,
});

interface CareerRow {
  id: string;
  manager_name: string;
  club_name: string;
  club_slug: string;
  season: number;
  matchday: number;
  league_position: number;
  points: number;
}

function CareersPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [careers, setCareers] = useState<CareerRow[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setFetching(true);
      const { data, error } = await supabase
        .from("careers")
        .select("id, manager_name, club_name, club_slug, season, matchday, league_position, points")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      else setCareers(data ?? []);
      setFetching(false);
    })();
  }, [user]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Encerrar essa carreira para sempre?")) return;
    try {
      await deleteCareer(id);
      setCareers((prev) => prev.filter((c) => c.id !== id));
      toast.success("Carreira encerrada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    }
  };

  return (
    <main className="min-h-screen">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Vestiário</p>
            <h1 className="text-2xl font-black">Suas carreiras</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-muted-foreground">
            {careers.length === 0 ? "Você ainda não comanda nenhum clube." : `Você gerencia ${careers.length} carreira(s).`}
          </p>
          <Button asChild>
            <Link to="/carreiras/nova"><Plus className="mr-2 h-4 w-4" /> Nova carreira</Link>
          </Button>
        </div>

        {fetching ? (
          <p className="text-muted-foreground">Carregando saves...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {careers.map((c) => {
              const club = CLUBS[c.club_slug as ClubSlug];
              return (
                <Card key={c.id} className="group relative overflow-hidden border-border/60 bg-card/70 transition hover:border-primary/50 hover:shadow-glow">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-gold" />
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{club?.name ?? c.club_name}</CardTitle>
                        <CardDescription>{club?.flag} {club?.league} • Temp. {c.season}</CardDescription>
                      </div>
                      <span className="text-3xl">{club?.badge}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Treinador</span>
                      <span className="font-semibold">{c.manager_name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <Stat label="Pos." value={`${c.league_position}º`} />
                      <Stat label="Pts" value={c.points} />
                      <Stat label="Rod." value={c.matchday} />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button asChild className="flex-1">
                        <Link to="/carreira/$careerId" params={{ careerId: c.id }}>Continuar</Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
      <Outlet />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-2">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}