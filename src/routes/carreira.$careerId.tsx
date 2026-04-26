import { createFileRoute, Link, Outlet, useNavigate, useLocation, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS, type ClubSlug } from "@/data/clubs";
import { CareerContext, type CareerData } from "@/lib/career-context";
import { Button } from "@/components/ui/button";
import { formatEur } from "@/lib/format";
import { ArrowLeft, Home, Users, ClipboardList, Newspaper, Store, Trophy, Inbox, CalendarClock, ThermometerSun, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { nextWindowChange, windowClosesAt } from "@/lib/season";

export const Route = createFileRoute("/carreira/$careerId")({
  component: CareerLayout,
});

function CareerLayout() {
  const { careerId } = useParams({ from: "/carreira/$careerId" });
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [career, setCareer] = useState<CareerData | null>(null);
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("careers").select("*").eq("id", careerId).maybeSingle();
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      navigate({ to: "/carreiras" });
      return;
    }
    setCareer(data as CareerData);
  }, [careerId, navigate]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    load().finally(() => setFetching(false));
  }, [user, load]);

  if (fetching || !career) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Entrando no clube...</div>;
  }

  const club = CLUBS[career.club_slug as ClubSlug];
  const isPreseason = location.pathname.endsWith("/preparacao");
  const tabs: Array<{
    to:
      | "/carreira/$careerId"
      | "/carreira/$careerId/elenco"
      | "/carreira/$careerId/escalacao"
      | "/carreira/$careerId/jogo"
      | "/carreira/$careerId/mercado"
      | "/carreira/$careerId/propostas"
      | "/carreira/$careerId/tabela"
      | "/carreira/$careerId/clima"
      | "/carreira/$careerId/noticias";
    label: string;
    icon: typeof Home;
    exact?: boolean;
  }> = [
    { to: "/carreira/$careerId", label: "Hub", icon: Home, exact: true },
    { to: "/carreira/$careerId/elenco", label: "Elenco", icon: Users },
    { to: "/carreira/$careerId/escalacao", label: "Escalação", icon: ListChecks },
    { to: "/carreira/$careerId/jogo", label: "Jogo", icon: ClipboardList },
    { to: "/carreira/$careerId/clima", label: "Clima", icon: ThermometerSun },
    { to: "/carreira/$careerId/mercado", label: "Mercado", icon: Store },
    { to: "/carreira/$careerId/propostas", label: "Propostas", icon: Inbox },
    { to: "/carreira/$careerId/tabela", label: "Tabela", icon: Trophy },
    { to: "/carreira/$careerId/noticias", label: "Notícias", icon: Newspaper },
  ];

  return (
    <CareerContext.Provider value={{ career, club, refresh: load }}>
      <div className="min-h-screen">
        <header
          className="border-b border-border/60 backdrop-blur"
          style={{ background: `linear-gradient(135deg, ${club.primary}33, transparent)` }}
        >
          <div className="container mx-auto px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/carreiras"><ArrowLeft className="mr-2 h-4 w-4" /> Saves</Link>
                </Button>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{club.badge}</span>
                  <div>
                    <h1 className="text-xl font-black leading-tight">{club.name}</h1>
                    <p className="text-xs text-muted-foreground">{career.manager_name} • Temp. {career.season} • Rod. {career.matchday}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <Pill label="Caixa" value={formatEur(career.cash_eur)} accent />
                <Pill label="Salários/sem" value={formatEur(career.weekly_wages_eur)} />
                <Pill label="Posição" value={`${career.league_position}º`} />
                <Pill label="Pontos" value={String(career.points)} />
                <Pill
                  label="Janela"
                  value={
                    career.transfer_window_open
                      ? `Aberta até R${windowClosesAt(career.matchday)}`
                      : `Fechada • abre R${nextWindowChange(career.matchday)}`
                  }
                  accent={career.transfer_window_open}
                />
              </div>
            </div>

            {isPreseason ? (
              <div className="mt-5 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
                <CalendarClock className="h-4 w-4 text-primary" />
                <span className="font-medium">Pré-temporada — prepare seu elenco e clique em <strong>Iniciar temporada</strong> quando estiver pronto.</span>
              </div>
            ) : (
              <nav className="mt-5 flex flex-wrap gap-1">
              {tabs.map((t) => {
                const isActive = t.exact
                  ? location.pathname === `/carreira/${careerId}` || location.pathname === `/carreira/${careerId}/`
                  : location.pathname.startsWith(t.to.replace("$careerId", careerId));
                const Icon = t.icon;
                return (
                  <Link
                    key={t.label}
                    to={t.to}
                    params={{ careerId }}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "text-muted-foreground hover:bg-card hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </Link>
                );
              })}
              </nav>
            )}
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <Outlet />
        </main>
      </div>
    </CareerContext.Provider>
  );
}

function Pill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex flex-col items-end rounded-lg border px-3 py-1.5 ${accent ? "border-primary/40 bg-primary/10" : "border-border/60 bg-card/40"}`}>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}