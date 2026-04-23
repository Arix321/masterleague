import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useCareer } from "@/lib/career-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { fanReaction, postMatchHeadline } from "@/lib/narrative";
import { toast } from "sonner";
import { Trophy, ChevronRight } from "lucide-react";

interface SquadRow {
  id: string;
  name: string;
  position: string;
  overall: number;
  goals: number;
  assists: number;
  injured: boolean;
}

export const Route = createFileRoute("/carreira/$careerId/jogo")({
  component: JogoPage,
});

function JogoPage() {
  const { career, club, refresh } = useCareer();
  const { careerId } = useParams({ from: "/carreira/$careerId/jogo" });
  const navigate = useNavigate();

  const [players, setPlayers] = useState<SquadRow[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const [opponent, setOpponent] = useState(career.next_opponent ?? club.rivals[0] ?? "Adversário");
  const [home, setHome] = useState(true);
  const [gf, setGf] = useState(0);
  const [ga, setGa] = useState(0);
  const [scorers, setScorers] = useState("");
  const [assists, setAssists] = useState("");
  const [position, setPosition] = useState(career.league_position);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("squad_players")
        .select("id, name, position, overall, goals, assists, injured")
        .eq("career_id", careerId)
        .eq("club_slug", career.club_slug);
      setPlayers((data ?? []) as SquadRow[]);
    })();
  }, [careerId, career.club_slug]);

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 11) next.add(id);
      else toast.error("Máximo de 11 titulares.");
      return next;
    });
  };

  const ordered = useMemo(
    () => [...players].sort((a, b) => b.overall - a.overall),
    [players],
  );

  const submit = async () => {
    if (picked.size !== 11) {
      toast.error("Escale exatamente 11 jogadores.");
      return;
    }
    if (!opponent.trim()) {
      toast.error("Informe o adversário.");
      return;
    }
    if (gf < 0 || ga < 0) {
      toast.error("Placar inválido.");
      return;
    }
    setBusy(true);
    const realResult: "V" | "E" | "D" = gf > ga ? "V" : gf < ga ? "D" : "E";
    const pointsDelta = realResult === "V" ? 3 : realResult === "E" ? 1 : 0;

    // Inserir partida
    const { error: matchErr } = await supabase.from("matches").insert({
      career_id: career.id,
      user_id: career.user_id,
      matchday: career.matchday,
      opponent: opponent.trim(),
      home,
      goals_for: gf,
      goals_against: ga,
      scorers: scorers || null,
      assists: assists || null,
      league_position_after: position,
      result: realResult,
    });
    if (matchErr) { toast.error(matchErr.message); setBusy(false); return; }

    // Atualizar gols/assistências de jogadores citados
    if (scorers.trim()) {
      const names = scorers.split(",").map((s) => s.trim()).filter(Boolean);
      for (const name of names) {
        const player = players.find((p) => p.name.toLowerCase() === name.toLowerCase());
        if (player) {
          await supabase.from("squad_players").update({ goals: player.goals + 1 }).eq("id", player.id);
        }
      }
    }
    if (assists.trim()) {
      const names = assists.split(",").map((s) => s.trim()).filter(Boolean);
      for (const name of names) {
        const player = players.find((p) => p.name.toLowerCase() === name.toLowerCase());
        if (player) {
          await supabase.from("squad_players").update({ assists: player.assists + 1 }).eq("id", player.id);
        }
      }
    }

    // Atualizar carreira
    const nextOpp = club.rivals[(career.matchday) % club.rivals.length] ?? "Adversário";
    const { error: cErr } = await supabase.from("careers").update({
      matchday: career.matchday + 1,
      points: career.points + pointsDelta,
      played: career.played + 1,
      wins: career.wins + (realResult === "V" ? 1 : 0),
      draws: career.draws + (realResult === "E" ? 1 : 0),
      losses: career.losses + (realResult === "D" ? 1 : 0),
      goals_for: career.goals_for + gf,
      goals_against: career.goals_against + ga,
      league_position: position,
      next_opponent: nextOpp,
      cash_eur: career.cash_eur - career.weekly_wages_eur,
      updated_at: new Date().toISOString(),
    }).eq("id", career.id);
    if (cErr) { toast.error(cErr.message); setBusy(false); return; }

    // Notícia
    await supabase.from("news_feed").insert({
      career_id: career.id,
      user_id: career.user_id,
      kind: "headline",
      title: postMatchHeadline(opponent.trim(), gf, ga, club.name),
      body: `${fanReaction(gf, ga)}\n\nGols: ${scorers || "—"}\nAssistências: ${assists || "—"}\nPosição na tabela: ${position}º`,
    });

    toast.success("Resultado registrado!");
    await refresh();
    navigate({ to: "/carreira/$careerId", params: { careerId } });
    setBusy(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle>Escalação obrigatória</CardTitle>
          <CardDescription>Selecione 11 titulares ({picked.size}/11)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
            {ordered.map((p) => {
              const checked = picked.has(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition ${
                    checked ? "border-primary bg-primary/10" : "border-border/40 bg-background/30 hover:bg-background/60"
                  } ${p.injured ? "opacity-50" : ""}`}
                >
                  <Checkbox checked={checked} onCheckedChange={() => !p.injured && toggle(p.id)} disabled={p.injured} />
                  <span className="w-10 rounded bg-muted px-1 py-0.5 text-center text-xs font-bold">{p.position}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-sm font-bold text-primary">{p.overall}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-gold" /> Resultado</CardTitle>
          <CardDescription>Você define cada placar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Adversário</Label>
            <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={home} onCheckedChange={(v) => setHome(Boolean(v))} /> Mando de campo (jogo em casa)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{club.shortName}</Label>
              <Input type="number" min={0} value={gf} onChange={(e) => setGf(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>{opponent.slice(0, 3).toUpperCase() || "ADV"}</Label>
              <Input type="number" min={0} value={ga} onChange={(e) => setGa(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Gols (separe por vírgula)</Label>
            <Input value={scorers} onChange={(e) => setScorers(e.target.value)} placeholder="Mbappé, Bellingham" />
          </div>
          <div className="space-y-1.5">
            <Label>Assistências (separe por vírgula)</Label>
            <Input value={assists} onChange={(e) => setAssists(e.target.value)} placeholder="Vinícius Júnior" />
          </div>
          <div className="space-y-1.5">
            <Label>Posição na tabela após o jogo</Label>
            <Input type="number" min={1} max={20} value={position} onChange={(e) => setPosition(parseInt(e.target.value) || 1)} />
          </div>

          <Button onClick={submit} disabled={busy} size="lg" className="w-full">
            {busy ? "Registrando..." : "Confirmar resultado"} <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}