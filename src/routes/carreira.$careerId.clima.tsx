import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useCareer } from "@/lib/career-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { HeartPulse, ThermometerSun, ShieldAlert, Sparkles, Frown, Smile, Meh, Activity } from "lucide-react";

interface SquadRow {
  id: string;
  name: string;
  position: string;
  overall: number;
  morale: number;
  injured: boolean;
  goals: number;
  assists: number;
  weekly_wage_eur: number;
  age: number;
}

export const Route = createFileRoute("/carreira/$careerId/clima")({
  component: ClimaPage,
});

function moraleLabel(m: number) {
  if (m >= 80) return { label: "Empolgado", color: "text-emerald-300", icon: Smile, bg: "bg-emerald-500/15 border-emerald-500/40" };
  if (m >= 60) return { label: "Tranquilo", color: "text-sky-300",     icon: Smile, bg: "bg-sky-500/15 border-sky-500/40" };
  if (m >= 40) return { label: "Neutro",    color: "text-yellow-300",  icon: Meh,   bg: "bg-yellow-500/15 border-yellow-500/40" };
  if (m >= 20) return { label: "Insatisfeito", color: "text-orange-300", icon: Frown, bg: "bg-orange-500/15 border-orange-500/40" };
  return                  { label: "Revoltado",  color: "text-red-400",     icon: Frown, bg: "bg-red-500/15 border-red-500/40" };
}

function ClimaPage() {
  const { career, club } = useCareer();
  const { careerId } = useParams({ from: "/carreira/$careerId/clima" });
  const [players, setPlayers] = useState<SquadRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("squad_players")
        .select("id, name, position, overall, morale, injured, goals, assists, weekly_wage_eur, age")
        .eq("career_id", careerId)
        .eq("club_slug", career.club_slug);
      setPlayers((data ?? []) as SquadRow[]);
    })();
  }, [careerId, career.club_slug]);

  const stats = useMemo(() => {
    if (players.length === 0) return null;
    const total = players.length;
    const avgMorale = Math.round(players.reduce((s, p) => s + p.morale, 0) / total);
    const injured = players.filter((p) => p.injured);
    const happy = players.filter((p) => p.morale >= 70).length;
    const unhappy = players.filter((p) => p.morale < 40);
    const topScorers = [...players].sort((a, b) => b.goals - a.goals).slice(0, 3).filter((p) => p.goals > 0);
    const topAssists = [...players].sort((a, b) => b.assists - a.assists).slice(0, 3).filter((p) => p.assists > 0);
    return { total, avgMorale, injured, happy, unhappy, topScorers, topAssists };
  }, [players]);

  const climateLabel = stats ? moraleLabel(stats.avgMorale) : null;

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ThermometerSun className="h-5 w-5 text-primary" /> Clima geral do {club.name}
          </CardTitle>
          <CardDescription>
            Termômetro do vestiário, lesões e destaques individuais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!stats ? (
            <p className="text-sm text-muted-foreground">Sem jogadores no elenco.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              <div className={`rounded-lg border p-4 ${climateLabel?.bg}`}>
                <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" /> Clima médio
                </div>
                <p className={`mt-1 text-2xl font-black ${climateLabel?.color}`}>{climateLabel?.label}</p>
                <Progress value={stats.avgMorale} className="mt-2 h-2" />
                <p className="mt-1 text-[10px] text-muted-foreground">{stats.avgMorale}/100</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/30 p-4">
                <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <Smile className="h-3.5 w-3.5" /> Felizes
                </div>
                <p className="mt-1 text-2xl font-black text-emerald-300">{stats.happy}</p>
                <p className="text-[10px] text-muted-foreground">de {stats.total} jogadores</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/30 p-4">
                <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <Frown className="h-3.5 w-3.5" /> Descontentes
                </div>
                <p className="mt-1 text-2xl font-black text-orange-300">{stats.unhappy.length}</p>
                <p className="text-[10px] text-muted-foreground">moral &lt; 40</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/30 p-4">
                <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <HeartPulse className="h-3.5 w-3.5" /> No DM
                </div>
                <p className="mt-1 text-2xl font-black text-red-400">{stats.injured.length}</p>
                <p className="text-[10px] text-muted-foreground">lesionados/suspensos</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Moral por jogador
            </CardTitle>
            <CardDescription>Quem está em alta, quem precisa de carinho.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
              {[...players].sort((a, b) => b.morale - a.morale).map((p) => {
                const m = moraleLabel(p.morale);
                const Icon = m.icon;
                return (
                  <div key={p.id} className="rounded-md border border-border/40 bg-background/30 p-2">
                    <div className="flex items-center gap-2">
                      <span className="w-9 rounded bg-muted px-1 py-0.5 text-center text-[10px] font-bold">{p.position}</span>
                      <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                      <Badge variant="outline" className={`gap-1 text-[10px] ${m.color} border-current`}>
                        <Icon className="h-3 w-3" /> {m.label}
                      </Badge>
                      {p.injured && <Badge variant="destructive" className="text-[9px]">Fora</Badge>}
                    </div>
                    <Progress value={p.morale} className="mt-1.5 h-1.5" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-400" /> Departamento médico
              </CardTitle>
              <CardDescription>Lesionados ou suspensos para a próxima rodada.</CardDescription>
            </CardHeader>
            <CardContent>
              {!stats || stats.injured.length === 0 ? (
                <p className="text-sm text-muted-foreground">Elenco completo, sem desfalques. ✅</p>
              ) : (
                <div className="space-y-1.5">
                  {stats.injured.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
                      <span className="w-9 rounded bg-muted px-1 py-0.5 text-center text-[10px] font-bold">{p.position}</span>
                      <span className="flex-1 truncate">{p.name}</span>
                      <Badge variant="destructive" className="text-[9px]">Indisponível</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-gold" /> Forma da temporada
              </CardTitle>
              <CardDescription>Goleadores e garçons em destaque.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">⚽ Top goleadores</p>
                {stats?.topScorers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Ninguém balançou as redes ainda.</p>
                ) : (
                  <div className="space-y-1">
                    {stats?.topScorers.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded border border-border/40 bg-background/30 px-2 py-1 text-sm">
                        <span className="truncate">{p.name}</span>
                        <Badge variant="outline" className="text-[10px]">{p.goals} gols</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">🎯 Top assistências</p>
                {stats?.topAssists.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem assistências registradas.</p>
                ) : (
                  <div className="space-y-1">
                    {stats?.topAssists.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded border border-border/40 bg-background/30 px-2 py-1 text-sm">
                        <span className="truncate">{p.name}</span>
                        <Badge variant="outline" className="text-[10px]">{p.assists} assist.</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}