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
import { Users, ArrowRightLeft, Trash2, Trophy, Plus, ArrowRight, Flame } from "lucide-react";

interface SquadRow {
  id: string;
  name: string;
  position: string;
  overall: number;
  injured: boolean;
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
  const [subs, setSubs] = useState<{ outId: string; inId: string; minute: number }[]>([]);
  const [opponent, setOpponent] = useState(career.next_opponent ?? club.rivals[0] ?? "Adversário");
  const [home, setHome] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("squad_players")
        .select("id, name, position, overall, injured")
        .eq("career_id", careerId)
        .eq("club_slug", career.club_slug);
      setPlayers((data ?? []) as SquadRow[]);
    })();
  }, [careerId, career.club_slug]);

  const ordered = useMemo(
    () => [...players].sort((a, b) => b.overall - a.overall),
    [players],
  );

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

  const addSub = () => {
    if (startersList.length === 0 || benchList.length === 0) {
      toast.error("Você precisa de titulares e reservas para planejar substituições.");
      return;
    }
    setSubs((s) => [...s, { outId: startersList[0].id, inId: benchList[0].id, minute: 60 }]);
  };

  const updateSub = (index: number, patch: Partial<{ outId: string; inId: string; minute: number }>) => {
    setSubs((s) => s.map((sub, i) => (i === index ? { ...sub, ...patch } : sub)));
  };

  const removeSub = (index: number) => {
    setSubs((s) => s.filter((_, i) => i !== index));
  };

  const proceed = () => {
    if (starters.size !== 11) {
      toast.error(`Escale 11 titulares (${starters.size}/11).`);
      return;
    }
    if (!opponent.trim()) {
      toast.error("Informe o adversário.");
      return;
    }
    saveLineup(careerId, {
      matchday: career.matchday,
      starters: Array.from(starters),
      bench: Array.from(bench),
      subs,
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
              <div className="mt-2 flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
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
            <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
              {ordered.map((p) => {
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
                    <span className="w-9 rounded bg-muted px-1 py-0.5 text-center text-[10px] font-bold">{p.position}</span>
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
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-primary" /> Substituições planejadas</CardTitle>
            <CardDescription>Defina quem entra e quem sai durante o jogo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {subs.length === 0 && (
              <p className="rounded-md border border-dashed border-border/40 p-3 text-center text-xs text-muted-foreground">
                Nenhuma substituição planejada. Clique em "Adicionar substituição".
              </p>
            )}
            {subs.map((sub, i) => (
              <div key={i} className="grid gap-2 rounded-md border border-border/40 bg-background/30 p-3 md:grid-cols-[1fr,1fr,90px,40px]">
                <div className="space-y-1">
                  <Label className="text-[10px]">Sai</Label>
                  <Select value={sub.outId} onValueChange={(v) => updateSub(i, { outId: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {startersList.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.position} • {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Entra</Label>
                  <Select value={sub.inId} onValueChange={(v) => updateSub(i, { inId: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {benchList.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.position} • {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Min.</Label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={sub.minute}
                    onChange={(e) => updateSub(i, { minute: parseInt(e.target.value) || 60 })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="self-end text-muted-foreground hover:text-destructive"
                  onClick={() => removeSub(i)}
                  aria-label="Remover substituição"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addSub} className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Adicionar substituição
            </Button>

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