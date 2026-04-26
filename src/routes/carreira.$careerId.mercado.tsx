import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useCareer } from "@/lib/career-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatEur } from "@/lib/format";
import { toast } from "sonner";
import { Handshake, Store, Lock, Search, X } from "lucide-react";
import React from "react";
import { nextWindowChange, windowClosesAt } from "@/lib/season";

interface MarketRow {
  id: string;
  name: string;
  position: string;
  overall: number;
  market_value_eur: number;
  expected_wage_eur: number;
  region: string;
  current_club: string;
}

export const Route = createFileRoute("/carreira/$careerId/mercado")({
  component: MercadoPage,
});

function MercadoPage() {
  const { career, club, refresh } = useCareer();
  const { careerId } = useParams({ from: "/carreira/$careerId/mercado" });
  const [market, setMarket] = useState<MarketRow[]>([]);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<string>("ALL");

  const load = async () => {
    const { data } = await supabase
      .from("market_players")
      .select("id, name, position, overall, market_value_eur, expected_wage_eur, region, current_club")
      .eq("career_id", careerId)
      .order("market_value_eur", { ascending: false });
    setMarket((data ?? []) as MarketRow[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [careerId]);

  const [clubFilter, setClubFilter] = useState<string>("ALL");
  const [valueOrder, setValueOrder] = useState<"desc" | "asc">("desc");

  const clubOptions = useMemo(() => {
    const set = new Set<string>();
    market.forEach((p) => set.add(p.current_club || "Livre"));
    return Array.from(set).sort();
  }, [market]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = market.filter((p) => {
      if (posFilter !== "ALL" && p.position !== posFilter) return false;
      if (clubFilter !== "ALL" && (p.current_club || "Livre") !== clubFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
    return list.sort((a, b) =>
      valueOrder === "desc"
        ? b.market_value_eur - a.market_value_eur
        : a.market_value_eur - b.market_value_eur,
    );
  }, [market, search, posFilter, clubFilter, valueOrder]);

  const negotiate = async (player: MarketRow, fee: number, wage: number, years: number) => {
    if (!career.transfer_window_open) {
      toast.error("Janela de transferências fechada.");
      return;
    }
    if (fee > career.cash_eur) {
      toast.error("Caixa insuficiente.");
      return;
    }
    const clubAccepts = fee >= player.market_value_eur * 0.9;
    const playerAccepts = wage >= player.expected_wage_eur * 0.95;

    await supabase.from("transfer_offers").insert({
      career_id: career.id,
      user_id: career.user_id,
      direction: "in",
      player_name: player.name,
      other_club: player.current_club || player.region,
      fee_eur: fee,
      wage_eur: wage,
      contract_years: years,
      status: clubAccepts && playerAccepts ? "accepted" : "rejected",
      club_response: clubAccepts ? "Aceita a proposta." : "Recusa: valor abaixo do esperado.",
      player_response: playerAccepts ? "Aceita os termos." : "Quer salário maior.",
    });

    if (!clubAccepts || !playerAccepts) {
      toast.error(!clubAccepts ? "Clube vendedor recusou." : "Jogador recusou os termos.");
      return;
    }

    // Contrata: adiciona ao elenco do meu clube, remove do mercado, debita caixa, ajusta folha
    await supabase.from("squad_players").insert({
      career_id: career.id,
      user_id: career.user_id,
      club_slug: career.club_slug,
      name: player.name,
      position: player.position,
      overall: player.overall,
      weekly_wage_eur: wage,
      market_value_eur: player.market_value_eur,
    });
    await supabase.from("market_players").delete().eq("id", player.id);
    await supabase.from("careers").update({
      cash_eur: career.cash_eur - fee,
      weekly_wages_eur: career.weekly_wages_eur + wage,
      updated_at: new Date().toISOString(),
    }).eq("id", career.id);
    await supabase.from("news_feed").insert({
      career_id: career.id,
      user_id: career.user_id,
      kind: "headline",
      title: `${club.name} acerta a contratação de ${player.name}`,
      body: `Vindo do ${player.current_club || player.region}. Valor: ${formatEur(fee)} • Salário: ${formatEur(wage)}/sem • Contrato: ${years} anos`,
    });
    toast.success(`${player.name} é seu novo reforço!`);
    await refresh();
    await load();
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" /> Mercado de transferências
            {!career.transfer_window_open && <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" /> Fechada</Badge>}
          </CardTitle>
          <CardDescription>
            {career.transfer_window_open
              ? `Janela aberta até a rodada ${windowClosesAt(career.matchday)}. Caixa: ${formatEur(career.cash_eur)}.`
              : `Janela fechada. Reabre na rodada ${nextWindowChange(career.matchday)}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3 pt-0">
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <Label className="text-xs">Buscar jogador</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Digite o nome..."
                className="pl-8 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="w-40 space-y-1.5">
            <Label className="text-xs">Posição</Label>
            <Select value={posFilter} onValueChange={setPosFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="GOL">GOL</SelectItem>
                <SelectItem value="ZAG">ZAG</SelectItem>
                <SelectItem value="LAT">LAT</SelectItem>
                <SelectItem value="VOL">VOL</SelectItem>
                <SelectItem value="MDF">MDF</SelectItem>
                <SelectItem value="MCT">MCT</SelectItem>
                <SelectItem value="MAT">MAT</SelectItem>
                <SelectItem value="PTA">PTA</SelectItem>
                <SelectItem value="CA">CA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-48 space-y-1.5">
            <Label className="text-xs">Time atual</Label>
            <Select value={clubFilter} onValueChange={setClubFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os times</SelectItem>
                {clubOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 space-y-1.5">
            <Label className="text-xs">Ordenar valor</Label>
            <Select value={valueOrder} onValueChange={(v) => setValueOrder(v as "desc" | "asc")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Maior valor</SelectItem>
                <SelectItem value="asc">Menor valor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            {filtered.length} de {market.length}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.id} className="border-border/60 bg-card/70">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground">
                  <span className="text-base font-black leading-none">{p.overall}</span>
                  <span className="text-[10px] font-semibold uppercase">{p.position}</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold">{p.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">🏟️ {p.current_club || "Livre"}</Badge>
                    <Badge variant="outline" className="text-[10px]">{p.region}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded border border-border/40 bg-background/30 p-2">
                  <p className="text-muted-foreground">Valor</p>
                  <p className="font-bold">{formatEur(p.market_value_eur)}</p>
                </div>
                <div className="rounded border border-border/40 bg-background/30 p-2">
                  <p className="text-muted-foreground">Salário esperado</p>
                  <p className="font-bold">{formatEur(p.expected_wage_eur)}/sem</p>
                </div>
              </div>
              <NegotiateDialog player={p} onNegotiate={negotiate} disabled={!career.transfer_window_open} />
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="md:col-span-2 xl:col-span-3 text-muted-foreground">
            {market.length === 0 ? "Mercado vazio." : "Nenhum jogador encontrado com esses filtros."}
          </p>
        )}
      </div>
    </div>
  );
}

function NegotiateDialog({ player, onNegotiate, disabled }: { player: MarketRow; onNegotiate: (p: MarketRow, fee: number, wage: number, years: number) => Promise<void>; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [fee, setFee] = useState(player.market_value_eur);
  const [wage, setWage] = useState(player.expected_wage_eur);
  const [years, setYears] = useState(3);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    await onNegotiate(player, fee, wage, years);
    setBusy(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" disabled={disabled}>
          {disabled ? <><Lock className="mr-2 h-4 w-4" /> Janela fechada</> : <><Handshake className="mr-2 h-4 w-4" /> Negociar</>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Negociar — {player.name}</DialogTitle>
          <DialogDescription>Defina sua proposta. O clube e o jogador podem aceitar ou recusar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Valor da transferência (€)</Label>
            <Input type="number" value={fee} onChange={(e) => setFee(parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>Salário semanal (€)</Label>
            <Input type="number" value={wage} onChange={(e) => setWage(parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>Anos de contrato</Label>
            <Input type="number" min={1} max={6} value={years} onChange={(e) => setYears(parseInt(e.target.value) || 3)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy} className="w-full">{busy ? "Enviando..." : "Enviar proposta"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}