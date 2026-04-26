import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useCareer } from "@/lib/career-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatEur } from "@/lib/format";
import { toast } from "sonner";
import { Heart, Stethoscope, Pencil, Plus, Sparkles, Trash2, PlayCircle, ShieldAlert, Trophy } from "lucide-react";
import { generatePlayerStats, randomPlayerName, estimateValue } from "@/lib/players";
import type { Position } from "@/data/squads";

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
}

const POSITION_ORDER: Record<string, number> = { GOL: 0, ZAG: 1, LAT: 2, VOL: 3, MEI: 4, ATA: 5 };
const POSITIONS: Position[] = ["GOL", "ZAG", "LAT", "VOL", "MDF", "MCT", "MAT", "PTA", "CA"];

export const Route = createFileRoute("/carreira/$careerId/preparacao")({
  component: PreparacaoPage,
});

function PreparacaoPage() {
  const { careerId } = useParams({ from: "/carreira/$careerId/preparacao" });
  const { career, club, refresh } = useCareer();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<SquadRow[]>([]);
  const [starting, setStarting] = useState(false);

  const loadPlayers = async () => {
    const { data, error } = await supabase
      .from("squad_players")
      .select("id, name, position, overall, weekly_wage_eur, market_value_eur, morale, injured, goals, assists, age, potential, attack, defense, physical, technique")
      .eq("career_id", careerId)
      .eq("club_slug", career.club_slug);
    if (error) toast.error(error.message);
    else setPlayers((data ?? []) as SquadRow[]);
  };

  useEffect(() => { loadPlayers(); /* eslint-disable-next-line */ }, [careerId, career.club_slug]);

  const sorted = useMemo(
    () => [...players].sort((a, b) => (POSITION_ORDER[a.position] ?? 9) - (POSITION_ORDER[b.position] ?? 9) || b.overall - a.overall),
    [players],
  );

  const totalWage = players.reduce((acc, p) => acc + p.weekly_wage_eur, 0);

  const handleEdit = async (id: string, patch: EditPatch) => {
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
    await loadPlayers();
  };

  const handleDelete = async (id: string, name: string, wage: number) => {
    if (!confirm(`Liberar ${name} do elenco?`)) return;
    const { error } = await supabase.from("squad_players").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("careers").update({
      weekly_wages_eur: Math.max(0, career.weekly_wages_eur - wage),
      updated_at: new Date().toISOString(),
    }).eq("id", career.id);
    toast.success(`${name} liberado.`);
    await refresh();
    await loadPlayers();
  };

  const handleCreate = async (name: string, age: number, position: Position) => {
    const stats = generatePlayerStats(age, position);
    const value = estimateValue(stats.overall, age, stats.potential);
    const { error } = await supabase.from("squad_players").insert({
      career_id: career.id,
      user_id: career.user_id,
      club_slug: career.club_slug,
      name, age, position,
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
    toast.success(`${name} adicionado — OVR ${stats.overall} / POT ${stats.potential}`);
    await refresh();
    await loadPlayers();
  };

  const startSeason = async () => {
    if (players.length < 11) {
      toast.error("Você precisa de ao menos 11 jogadores para iniciar a temporada.");
      return;
    }
    setStarting(true);
    navigate({ to: "/carreira/$careerId", params: { careerId: career.id } });
  };

  return (
    <div className="space-y-6">
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-primary" />
              <div>
                <p className="font-bold">Pré-temporada — {club.name}</p>
                <p className="text-sm text-muted-foreground">
                  Edite, crie e libere jogadores como quiser. Quando o elenco estiver pronto, clique em <strong>Iniciar temporada</strong>.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Pill label="Jogadores" value={String(players.length)} accent={players.length >= 11} />
              <Pill label="Folha/sem" value={formatEur(totalWage)} />
              <Button size="lg" onClick={startSeason} disabled={starting} className="gap-2">
                <PlayCircle className="h-5 w-5" /> {starting ? "Iniciando..." : "Iniciar temporada"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Elenco do {club.name}</CardTitle>
              <CardDescription>Edite atributos, idade, posição e salário. Crie ou libere jogadores à vontade.</CardDescription>
            </div>
            <CreatePlayerDialog onCreate={handleCreate} />
          </CardHeader>
        </Card>

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
                    <span>{p.age} anos</span>
                    <span>POT {p.potential}</span>
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {p.morale}</span>
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
          {sorted.length === 0 && (
            <Card className="md:col-span-2 xl:col-span-3 border-destructive/40 bg-destructive/10">
              <CardContent className="flex items-center gap-3 p-4 text-sm">
                <ShieldAlert className="h-5 w-5 text-destructive" /> Elenco vazio. Crie jogadores para começar.
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-center pt-4">
          <Button size="lg" onClick={startSeason} disabled={starting} className="gap-2">
            <PlayCircle className="h-5 w-5" /> {starting ? "Iniciando..." : "Iniciar temporada"}
          </Button>
        </div>
    </div>
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

  const num = (v: string, fb: number) => {
    const n = parseInt(v);
    return Number.isFinite(n) ? n : fb;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="h-7 gap-1 px-2 text-xs"><Pencil className="h-3.5 w-3.5" />Editar</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar jogador</DialogTitle>
          <DialogDescription>Ajuste tudo antes de iniciar a temporada.</DialogDescription>
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
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Criar jogador</DialogTitle>
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