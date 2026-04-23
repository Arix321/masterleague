import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCareer } from "@/lib/career-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface MatchRow {
  id: string;
  matchday: number;
  opponent: string;
  goals_for: number;
  goals_against: number;
  result: string;
  league_position_after: number | null;
}

export const Route = createFileRoute("/carreira/$careerId/tabela")({
  component: TabelaPage,
});

function TabelaPage() {
  const { career, club } = useCareer();
  const { careerId } = useParams({ from: "/carreira/$careerId/tabela" });
  const [matches, setMatches] = useState<MatchRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, matchday, opponent, goals_for, goals_against, result, league_position_after")
        .eq("career_id", careerId)
        .order("matchday", { ascending: false })
        .limit(15);
      setMatches((data ?? []) as MatchRow[]);
    })();
  }, [careerId]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle>Sua campanha</CardTitle>
          <CardDescription>{club.league} • Temporada {career.season}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Pos." value={`${career.league_position}º`} highlight />
            <Stat label="Pontos" value={career.points} highlight />
            <Stat label="Jogos" value={career.played} />
            <Stat label="Saldo" value={career.goals_for - career.goals_against} />
            <Stat label="Vitórias" value={career.wins} />
            <Stat label="Empates" value={career.draws} />
            <Stat label="Derrotas" value={career.losses} />
            <Stat label="Gols pró" value={career.goals_for} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            A posição é definida por você ao registrar cada jogo, refletindo o que aconteceu nos outros jogos da rodada.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle>Últimos resultados</CardTitle>
          <CardDescription>Os 15 jogos mais recentes</CardDescription>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum jogo registrado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {matches.map((m) => (
                <li key={m.id} className="flex items-center justify-between rounded-md border border-border/40 bg-background/30 px-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${
                      m.result === "V" ? "bg-primary text-primary-foreground" :
                      m.result === "E" ? "bg-muted text-foreground" :
                      "bg-destructive text-destructive-foreground"
                    }`}>{m.result}</span>
                    <span className="text-muted-foreground">R{m.matchday}</span>
                    <span>vs <span className="font-medium">{m.opponent}</span></span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold">{m.goals_for} x {m.goals_against}</span>
                    {m.league_position_after && <span className="text-xs text-muted-foreground">{m.league_position_after}º</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-primary/40 bg-primary/10" : "border-border/40 bg-background/30"}`}>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className={`text-2xl font-black ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}