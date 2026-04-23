import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useCareer } from "@/lib/career-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEur } from "@/lib/format";
import { toast } from "sonner";
import { Heart, ShieldAlert, Stethoscope } from "lucide-react";

interface SquadRow {
  id: string;
  name: string;
  position: string;
  overall: number;
  weekly_wage_eur: number;
  market_value_eur: number;
  morale: number;
  injured: boolean;
  goals: number;
  assists: number;
}

const POSITION_ORDER: Record<string, number> = { GOL: 0, ZAG: 1, LAT: 2, VOL: 3, MEI: 4, ATA: 5 };

export const Route = createFileRoute("/carreira/$careerId/elenco")({
  component: ElencoPage,
});

function ElencoPage() {
  const { career } = useCareer();
  const { careerId } = useParams({ from: "/carreira/$careerId/elenco" });
  const [players, setPlayers] = useState<SquadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("squad_players")
      .select("id, name, position, overall, weekly_wage_eur, market_value_eur, morale, injured, goals, assists")
      .eq("career_id", careerId)
      .eq("club_slug", career.club_slug);
    if (error) toast.error(error.message);
    else setPlayers((data ?? []) as SquadRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [careerId, career.club_slug]);

  const sorted = useMemo(
    () => [...players].sort((a, b) => (POSITION_ORDER[a.position] ?? 9) - (POSITION_ORDER[b.position] ?? 9) || b.overall - a.overall),
    [players],
  );

  const totalWage = players.reduce((acc, p) => acc + p.weekly_wage_eur, 0);

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle>Elenco — {career.club_name}</CardTitle>
          <CardDescription>{players.length} jogadores • Folha semanal {formatEur(totalWage)}</CardDescription>
        </CardHeader>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Carregando elenco...</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((p) => (
            <Card key={p.id} className="border-border/60 bg-card/70">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground">
                  <span className="text-lg font-black leading-none">{p.overall}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest">{p.position}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold">{p.name}</p>
                    {p.injured && <Badge variant="destructive" className="gap-1"><Stethoscope className="h-3 w-3" />Lesionado</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {p.morale}</span>
                    <span>⚽ {p.goals}</span>
                    <span>🅰️ {p.assists}</span>
                    <span>{formatEur(p.weekly_wage_eur)}/sem</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase text-muted-foreground">Valor</p>
                  <p className="font-bold">{formatEur(p.market_value_eur)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {sorted.length === 0 && (
            <Card className="md:col-span-2 xl:col-span-3 border-destructive/40 bg-destructive/10">
              <CardContent className="flex items-center gap-3 p-4 text-sm">
                <ShieldAlert className="h-5 w-5 text-destructive" /> Elenco vazio. Use o mercado para reforçar.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}