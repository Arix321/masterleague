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
import { Heart, ShieldAlert, Stethoscope, Pencil, Plus, Sparkles } from "lucide-react";
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
const POSITIONS: Position[] = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"];

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
      .select("id, name, position, overall, weekly_wage_eur, market_value_eur, morale, injured, goals, assists, age, potential, attack, defense, physical, technique")
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

  const handleEdit = async (id: string, name: string, age: number, position: Position) => {
    const { error } = await supabase.from("squad_players").update({ name, age, position }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Jogador atualizado.");
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
          <CreatePlayerDialog onCreate={handleCreate} />
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
                    <span>{p.age} anos</span>
                    <span>POT {p.potential}</span>
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {p.morale}</span>
                    <span>⚽ {p.goals}</span>
                    <span>🅰️ {p.assists}</span>
                    <span>{formatEur(p.weekly_wage_eur)}/sem</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-xs uppercase text-muted-foreground">Valor</p>
                  <p className="font-bold">{formatEur(p.market_value_eur)}</p>
                  <EditPlayerDialog player={p} onEdit={handleEdit} />
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

function EditPlayerDialog({ player, onEdit }: { player: SquadRow; onEdit: (id: string, name: string, age: number, position: Position) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(player.name);
  const [age, setAge] = useState(player.age);
  const [position, setPosition] = useState<Position>(player.position as Position);
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2"><Pencil className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar jogador</DialogTitle>
          <DialogDescription>Mudanças impactam escalação e mercado.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Idade</Label><Input type="number" min={15} max={45} value={age} onChange={(e) => setAge(parseInt(e.target.value) || 18)} /></div>
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
        <DialogFooter>
          <Button onClick={async () => { if (!name.trim()) return; setBusy(true); await onEdit(player.id, name.trim(), age, position); setBusy(false); setOpen(false); }} disabled={busy} className="w-full">
            {busy ? "Salvando..." : "Salvar"}
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
  const [position, setPosition] = useState<Position>("MEI");
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