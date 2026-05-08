import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useCareer } from "@/lib/career-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatEur } from "@/lib/format";
import { toast } from "sonner";
import { Heart, ShieldAlert, Stethoscope, Pencil, Plus, Sparkles, Trash2, UserRound, Wand2, Loader2 } from "lucide-react";
import { generatePlayerStats, randomPlayerName, estimateValue } from "@/lib/players";
import { POSITION_ORDER, POSITION_LIST, type Position } from "@/data/squads";

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
  age: number;
  potential: number;
  attack: number;
  defense: number;
  physical: number;
  technique: number;
  face_url: string | null;
}

const POSITIONS: Position[] = POSITION_LIST;

// Agrupa posições em setores táticos para organização visual.
const SECTORS: Array<{ key: string; label: string; icon: string; positions: Position[] }> = [
  { key: "gol",     label: "Goleiros",       icon: "🧤", positions: ["GOL"] },
  { key: "def",     label: "Defensores",     icon: "🛡️", positions: ["ZAG", "LAT"] },
  { key: "meio",    label: "Meio-campo",     icon: "⚙️", positions: ["VOL", "MDF", "MCT", "MAT"] },
  { key: "ataque",  label: "Atacantes",      icon: "⚡", positions: ["PTA", "CA"] },
];

export const Route = createFileRoute("/carreira/$careerId/elenco")({
  component: ElencoPage,
});

function ElencoPage() {
  const { career, refresh } = useCareer();
  const { careerId } = useParams({ from: "/carreira/$careerId/elenco" });
  const [players, setPlayers] = useState<SquadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("squad_players")
      .select("id, name, position, overall, weekly_wage_eur, market_value_eur, morale, injured, goals, assists, age, potential, attack, defense, physical, technique, face_url")
      .eq("career_id", careerId)
      .eq("club_slug", career.club_slug);
    if (error) toast.error(error.message);
    else setPlayers((data ?? []) as SquadRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [careerId, career.club_slug]);

  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);

  const generateFace = async (playerId: string, name: string, age: number, position: string) => {
    setGenerating((g) => ({ ...g, [playerId]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-face", {
        body: { playerId, name, age, position },
      });
      if (error) throw error;
      if (data?.face_url) {
        setPlayers((prev) => prev.map((p) => p.id === playerId ? { ...p, face_url: data.face_url } : p));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar face.");
    } finally {
      setGenerating((g) => ({ ...g, [playerId]: false }));
    }
  };

  const generateAllFaces = async () => {
    const targets = players.filter((p) => !p.face_url);
    if (targets.length === 0) { toast.info("Todos os jogadores já têm face."); return; }
    setBulkBusy(true);
    toast.info(`Gerando ${targets.length} faces, isso pode levar alguns minutos...`);
    for (const p of targets) {
      await generateFace(p.id, p.name, p.age, p.position);
    }
    setBulkBusy(false);
    toast.success("Faces geradas!");
  };

  const sorted = useMemo(
    () => [...players].sort((a, b) => (POSITION_ORDER[a.position] ?? 9) - (POSITION_ORDER[b.position] ?? 9) || b.overall - a.overall),
    [players],
  );

  const totalWage = players.reduce((acc, p) => acc + p.weekly_wage_eur, 0);

  // Agrupa jogadores por setor para renderização em seções.
  const grouped = useMemo(() => {
    return SECTORS.map((sector) => ({
      ...sector,
      players: sorted.filter((p) => sector.positions.includes(p.position as Position)),
    }));
  }, [sorted]);

  const handleEdit = async (
    id: string,
    patch: {
      name: string;
      age: number;
      position: Position;
      overall: number;
      potential: number;
      attack: number;
      defense: number;
      physical: number;
      technique: number;
      weekly_wage_eur: number;
    },
  ) => {
    const before = players.find((p) => p.id === id);
    const { error } = await supabase.from("squad_players").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (before && before.weekly_wage_eur !== patch.weekly_wage_eur) {
      const delta = patch.weekly_wage_eur - before.weekly_wage_eur;
      await supabase.from("careers").update({
        weekly_wages_eur: Math.max(0, career.weekly_wages_eur + delta),
        updated_at: new Date().toISOString(),
      }).eq("id", career.id);
      await refresh();
    }
    toast.success("Jogador atualizado.");
    await load();
  };

  const handleDelete = async (id: string, name: string, wage: number) => {
    if (!confirm(`Liberar ${name} do elenco? Essa ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("squad_players").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("careers").update({
      weekly_wages_eur: Math.max(0, career.weekly_wages_eur - wage),
      updated_at: new Date().toISOString(),
    }).eq("id", career.id);
    toast.success(`${name} removido do elenco.`);
    await refresh();
    await load();
  };

  const handleCreate = async (name: string, age: number, position: Position) => {
    const stats = generatePlayerStats(age, position);
    const value = estimateValue(stats.overall, age, stats.potential);
    const { error } = await supabase.from("squad_players").insert({
      career_id: career.id,
      user_id: career.user_id,
      club_slug: career.club_slug,
      name,
      age,
      position,
      overall: stats.overall,
      potential: stats.potential,
      attack: stats.attack,
      defense: stats.defense,
      physical: stats.physical,
      technique: stats.technique,
      market_value_eur: value.marketValue,
      weekly_wage_eur: value.weeklyWage,
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("careers").update({
      weekly_wages_eur: career.weekly_wages_eur + value.weeklyWage,
      updated_at: new Date().toISOString(),
    }).eq("id", career.id);
    toast.success(`${name} criado(a) — OVR ${stats.overall} / POT ${stats.potential}`);
    await refresh();
    await load();
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Elenco — {career.club_name}</CardTitle>
            <CardDescription>{players.length} jogadores • Folha semanal {formatEur(totalWage)}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2 sm:flex-row">
            <Button size="sm" variant="secondary" onClick={generateAllFaces} disabled={bulkBusy}>
              {bulkBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
              Gerar faces
            </Button>
            <CreatePlayerDialog onCreate={handleCreate} />
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Carregando elenco...</p>
      ) : (
        <div className="space-y-6">
          {sorted.length === 0 && (
            <Card className="border-destructive/40 bg-destructive/10">
              <CardContent className="flex items-center gap-3 p-4 text-sm">
                <ShieldAlert className="h-5 w-5 text-destructive" /> Elenco vazio. Use o mercado para reforçar.
              </CardContent>
            </Card>
          )}
          {grouped.map((sector) => (
            sector.players.length === 0 ? null : (
              <section key={sector.key} className="space-y-2">
                <div className="flex items-center gap-2 border-b border-border/40 pb-1.5">
                  <span className="text-lg">{sector.icon}</span>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    {sector.label}
                  </h2>
                  <Badge variant="secondary" className="ml-1 text-[10px]">{sector.players.length}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {sector.players.map((p) => (
                    <Card key={p.id} className="border-border/60 bg-card/70">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="relative shrink-0">
                          {p.face_url ? (
                            <img
                              src={p.face_url}
                              alt={p.name}
                              className="h-16 w-16 rounded-xl border border-border/60 object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => generateFace(p.id, p.name, p.age, p.position)}
                              disabled={!!generating[p.id] || bulkBusy}
                              title="Gerar face com IA"
                              className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/40 text-muted-foreground transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed"
                            >
                              {generating[p.id] ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserRound className="h-6 w-6" />}
                            </button>
                          )}
                          <div className="absolute -bottom-1 -right-1 flex flex-col items-center justify-center rounded-md bg-gradient-gold px-1.5 py-0.5 text-primary-foreground shadow">
                            <span className="text-[11px] font-black leading-none">{p.overall}</span>
                            <span className="text-[8px] font-semibold uppercase tracking-widest leading-none">{p.position}</span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-bold">{p.name}</p>
                            {p.injured && <Badge variant="destructive" className="gap-1"><Stethoscope className="h-3 w-3" />Suspenso/Lesionado</Badge>}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{p.age} anos</span>
                            <span>POT {p.potential}</span>
                            <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {p.morale}</span>
                            <span>⚽ {p.goals}</span>
                            <span>🅰️ {p.assists}</span>
                            <span>{formatEur(p.weekly_wage_eur)}/sem</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <p className="text-xs uppercase text-muted-foreground">Valor</p>
                          <p className="font-bold">{formatEur(p.market_value_eur)}</p>
                          <div className="flex gap-1">
                            <EditPlayerDialog player={p} onEdit={handleEdit} />
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id, p.name, p.weekly_wage_eur)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )
          ))}
        </div>
      )}
    </div>
  );
}

interface EditPatch {
  name: string;
  age: number;
  position: Position;
  overall: number;
  potential: number;
  attack: number;
  defense: number;
  physical: number;
  technique: number;
  weekly_wage_eur: number;
}

function EditPlayerDialog({ player, onEdit }: { player: SquadRow; onEdit: (id: string, patch: EditPatch) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(player.name);
  const [age, setAge] = useState(player.age);
  const [position, setPosition] = useState<Position>(player.position as Position);
  const [overall, setOverall] = useState(player.overall);
  const [potential, setPotential] = useState(player.potential);
  const [attack, setAttack] = useState(player.attack);
  const [defense, setDefense] = useState(player.defense);
  const [physical, setPhysical] = useState(player.physical);
  const [technique, setTechnique] = useState(player.technique);
  const [wage, setWage] = useState(player.weekly_wage_eur);
  const [busy, setBusy] = useState(false);

  // reset state when opening with a different player
  useEffect(() => {
    if (open) {
      setName(player.name);
      setAge(player.age);
      setPosition(player.position as Position);
      setOverall(player.overall);
      setPotential(player.potential);
      setAttack(player.attack);
      setDefense(player.defense);
      setPhysical(player.physical);
      setTechnique(player.technique);
      setWage(player.weekly_wage_eur);
    }
  }, [open, player]);

  const num = (v: string, fallback: number) => {
    const n = parseInt(v);
    return Number.isFinite(n) ? n : fallback;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="h-7 gap-1 px-2 text-xs"><Pencil className="h-3.5 w-3.5" />Editar</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar jogador</DialogTitle>
          <DialogDescription>Disponível durante toda a temporada. Mudanças impactam escalação e mercado.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5"><Label>Idade</Label><Input type="number" min={15} max={45} value={age} onChange={(e) => setAge(num(e.target.value, 18))} /></div>
            <div className="space-y-1.5 col-span-2">
              <Label>Posição</Label>
              <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label>Overall</Label><Input type="number" min={40} max={99} value={overall} onChange={(e) => setOverall(num(e.target.value, 70))} /></div>
            <div className="space-y-1.5"><Label>Potencial</Label><Input type="number" min={40} max={99} value={potential} onChange={(e) => setPotential(num(e.target.value, 80))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label>Ataque</Label><Input type="number" min={40} max={99} value={attack} onChange={(e) => setAttack(num(e.target.value, 70))} /></div>
            <div className="space-y-1.5"><Label>Defesa</Label><Input type="number" min={40} max={99} value={defense} onChange={(e) => setDefense(num(e.target.value, 70))} /></div>
            <div className="space-y-1.5"><Label>Físico</Label><Input type="number" min={40} max={99} value={physical} onChange={(e) => setPhysical(num(e.target.value, 70))} /></div>
            <div className="space-y-1.5"><Label>Técnica</Label><Input type="number" min={40} max={99} value={technique} onChange={(e) => setTechnique(num(e.target.value, 70))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Salário semanal (€)</Label><Input type="number" min={0} step={1000} value={wage} onChange={(e) => setWage(num(e.target.value, 0))} /></div>
        </div>
        <DialogFooter>
          <Button
            onClick={async () => {
              if (!name.trim()) return;
              setBusy(true);
              await onEdit(player.id, {
                name: name.trim(),
                age,
                position,
                overall: Math.max(40, Math.min(99, overall)),
                potential: Math.max(40, Math.min(99, Math.max(potential, overall))),
                attack: Math.max(40, Math.min(99, attack)),
                defense: Math.max(40, Math.min(99, defense)),
                physical: Math.max(40, Math.min(99, physical)),
                technique: Math.max(40, Math.min(99, technique)),
                weekly_wage_eur: Math.max(0, wage),
              });
              setBusy(false);
              setOpen(false);
            }}
            disabled={busy}
            className="w-full"
          >
            {busy ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreatePlayerDialog({ onCreate }: { onCreate: (name: string, age: number, position: Position) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState(20);
  const [position, setPosition] = useState<Position>("MCT");
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setName(randomPlayerName()); }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Novo jogador</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-gold" /> Criar jogador</DialogTitle>
          <DialogDescription>Atributos, overall e potencial são gerados automaticamente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label>Idade</Label><Input type="number" min={15} max={40} value={age} onChange={(e) => setAge(parseInt(e.target.value) || 20)} /></div>
            <div className="space-y-1.5">
              <Label>Posição</Label>
              <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">💡 Jovens (≤22) recebem potencial alto. Veteranos (≥30) têm overall sólido mas pouca evolução.</p>
        </div>
        <DialogFooter>
          <Button onClick={async () => { if (!name.trim()) return; setBusy(true); await onCreate(name.trim(), age, position); setBusy(false); setOpen(false); }} disabled={busy} className="w-full">
            {busy ? "Criando..." : "Criar e adicionar ao elenco"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}