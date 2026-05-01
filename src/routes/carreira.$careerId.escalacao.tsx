import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useCareer } from "@/lib/career-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isDerby, derbyName } from "@/lib/season";
import { saveLineup } from "@/lib/lineup";
import { toast } from "sonner";
import { Users, Trophy, ArrowRight, Flame, Star } from "lucide-react";
import { POSITION_ORDER, POSITION_LIST, POSITION_LABEL, normalizePosition, type Position } from "@/data/squads";

interface SquadRow {
  id: string;
  name: string;
  position: string;
  overall: number;
  injured: boolean;
  is_captain: boolean;
}

export const Route = createFileRoute("/carreira/$careerId/escalacao")({
  component: EscalacaoPage,
});

function EscalacaoPage() {
  const { career, club } = useCareer();
  const { careerId } = useParams({ from: "/carreira/$careerId/escalacao" });
  const navigate = useNavigate();

  const [players, setPlayers] = useState<SquadRow[]>([]);
  const [starters, setStarters] = useState<Set<string>>(new Set());
  const [bench, setBench] = useState<Set<string>>(new Set());
  const [captainId, setCaptainId] = useState<string>("");
  const [opponent, setOpponent] = useState(career.next_opponent ?? club.rivals[0] ?? "Adversário");
  const [home, setHome] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("squad_players")
        .select("id, name, position, overall, injured, is_captain")
        .eq("career_id", careerId)
        .eq("club_slug", career.club_slug);
      const rows = (data ?? []) as SquadRow[];
      setPlayers(rows);
      const cap = rows.find((p) => p.is_captain);
      if (cap) setCaptainId(cap.id);
    })();
  }, [careerId, career.club_slug]);

  // Ordenado por posição (do gol ao centroavante) e depois por overall desc.
  const ordered = useMemo(
    () =>
      [...players].sort((a, b) => {
        const pa = POSITION_ORDER[normalizePosition(a.position)] ?? 99;
        const pb = POSITION_ORDER[normalizePosition(b.position)] ?? 99;
        if (pa !== pb) return pa - pb;
        return b.overall - a.overall;
      }),
    [players],
  );

  // Agrupa por posição mantendo a ordem do POSITION_LIST.
  const groupedPlayers = useMemo(() => {
    const groups = new Map<Position, SquadRow[]>();
    for (const pos of POSITION_LIST) groups.set(pos, []);
    for (const p of ordered) {
      const pos = normalizePosition(p.position);
      groups.get(pos)!.push(p);
    }
    return groups;
  }, [ordered]);

  const toggleStarter = (id: string) => {
    setStarters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size >= 11) {
        toast.error("Máximo de 11 titulares.");
        return prev;
      } else {
        next.add(id);
        // se estava no banco, remove de lá
        setBench((b) => {
          const nb = new Set(b);
          nb.delete(id);
          return nb;
        });
      }
      return next;
    });
  };

  const toggleBench = (id: string) => {
    if (starters.has(id)) {
      toast.error("Esse jogador já é titular.");
      return;
    }
    setBench((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size >= 7) {
        toast.error("Máximo de 7 reservas.");
        return prev;
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startersList = useMemo(
    () => ordered.filter((p) => starters.has(p.id)),
    [ordered, starters],
  );
  const benchList = useMemo(
    () => ordered.filter((p) => bench.has(p.id)),
    [ordered, bench],
  );

  const proceed = () => {
    if (starters.size !== 11) {
      toast.error(`Escale 11 titulares (${starters.size}/11).`);
      return;
    }
    if (!opponent.trim()) {
      toast.error("Informe o adversário.");
      return;
    }
    if (captainId && !starters.has(captainId)) {
      toast.error("O capitão precisa estar entre os titulares.");
      return;
    }
    // Persiste capitão (limpa anterior e marca o novo)
    (async () => {
      await supabase
        .from("squad_players")
        .update({ is_captain: false })
        .eq("career_id", careerId)
        .eq("club_slug", career.club_slug);
      if (captainId) {
        await supabase.from("squad_players").update({ is_captain: true }).eq("id", captainId);
      }
    })();
    saveLineup(careerId, {
      matchday: career.matchday,
      starters: Array.from(starters),
      bench: Array.from(bench),
      subs: [], // substituições agora são feitas durante o jogo
      opponent: opponent.trim(),
      home,
    });
    toast.success("Escalação confirmada! Hora do jogo.");
    navigate({ to: "/carreira/$careerId/jogo", params: { careerId } });
  };

  const derby = isDerby(club.slug, opponent.trim());
  const dName = derbyName(club.slug, opponent.trim());

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" /> Próximo confronto
          </CardTitle>
          <CardDescription>Defina o adversário e o mando antes de escalar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Adversário</Label>
            <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} list="rivals-list" />
            <datalist id="rivals-list">
              {club.rivals.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            {derby && (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                <Flame className="h-4 w-4" />
                <span><strong>{dName}!</strong> Esse jogo vale o orgulho da torcida.</span>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Mando</Label>
            <Select value={home ? "home" : "away"} onValueChange={(v) => setHome(v === "home")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="home">Em casa 🏟️</SelectItem>
                <SelectItem value="away">Fora ✈️</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Elenco</CardTitle>
            <CardDescription>
              Titulares: {starters.size}/11 • Reservas: {bench.size}/7
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
              {POSITION_LIST.map((pos) => {
                const list = groupedPlayers.get(pos) ?? [];
                if (list.length === 0) return null;
                return (
                  <div key={pos} className="space-y-1">
                    <p className="sticky top-0 z-10 -mx-1 bg-card/90 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground backdrop-blur">
                      {pos} — {POSITION_LABEL[pos]} ({list.length})
                    </p>
                    {list.map((p) => {
                      const isStarter = starters.has(p.id);
                      const isBench = bench.has(p.id);
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center gap-2 rounded-md border px-2 py-2 transition ${
                            isStarter
                              ? "border-primary bg-primary/10"
                              : isBench
                              ? "border-sky-500/40 bg-sky-500/10"
                              : "border-border/40 bg-background/30"
                          } ${p.injured ? "opacity-50" : ""}`}
                        >
                          <span className="w-10 rounded bg-muted px-1 py-0.5 text-center text-[10px] font-bold">{pos}</span>
                          <span className="flex-1 truncate text-sm">{p.name}</span>
                          <span className="text-xs font-bold text-primary">{p.overall}</span>
                          {p.injured && <Badge variant="destructive" className="text-[9px]">Lesão</Badge>}
                          <label className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
                            <Checkbox
                              checked={isStarter}
                              onCheckedChange={() => !p.injured && toggleStarter(p.id)}
                              disabled={p.injured}
                            />
                            Titular
                          </label>
                          <label className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
                            <Checkbox
                              checked={isBench}
                              onCheckedChange={() => !p.injured && toggleBench(p.id)}
                              disabled={p.injured || isStarter}
                            />
                            Banco
                          </label>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Resumo da escalação</CardTitle>
            <CardDescription>
              As substituições serão feitas ao vivo, durante o jogo, na tela de resultado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Titulares ({startersList.length}/11)</p>
              {startersList.length === 0 ? (
                <p className="rounded-md border border-dashed border-border/40 p-3 text-center text-xs text-muted-foreground">
                  Selecione 11 titulares na lista ao lado.
                </p>
              ) : (
                <div className="space-y-1">
                  {startersList.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-sm">
                      <span className="w-10 rounded bg-muted px-1 py-0.5 text-center text-[10px] font-bold">{normalizePosition(p.position)}</span>
                      <span className="flex-1 truncate">{p.name}</span>
                      <button
                        type="button"
                        onClick={() => setCaptainId(captainId === p.id ? "" : p.id)}
                        className={`rounded p-1 transition ${captainId === p.id ? "text-gold" : "text-muted-foreground hover:text-gold"}`}
                        title={captainId === p.id ? "Remover capitania" : "Definir como capitão"}
                      >
                        <Star className={`h-3.5 w-3.5 ${captainId === p.id ? "fill-current" : ""}`} />
                      </button>
                      <span className="text-xs font-bold text-primary">{p.overall}</span>
                    </div>
                  ))}
                </div>
              )}
              {captainId && (
                <p className="text-[10px] text-muted-foreground">⭐ Capitão: <strong>{startersList.find((p) => p.id === captainId)?.name ?? "—"}</strong></p>
              )}
            </div>
            {benchList.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Banco ({benchList.length}/7)</p>
                <div className="space-y-1">
                  {benchList.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1.5 text-sm">
                      <span className="w-10 rounded bg-muted px-1 py-0.5 text-center text-[10px] font-bold">{normalizePosition(p.position)}</span>
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="text-xs font-bold text-sky-300">{p.overall}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={proceed} size="lg" className="w-full">
                Confirmar escalação e ir ao jogo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/carreira/$careerId" params={{ careerId }}>Voltar ao hub</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}