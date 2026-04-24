import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCareer } from "@/lib/career-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatEur } from "@/lib/format";
import { toast } from "sonner";
import { Inbox, Check, X, Handshake, Heart } from "lucide-react";

interface IncomingRow {
  id: string;
  player_id: string;
  player_name: string;
  from_club: string;
  fee_eur: number;
  bonus_eur: number;
  wage_offered_eur: number;
  offer_type: string;
  player_interest: number;
  status: string;
  matchday: number;
  created_at: string;
}

export const Route = createFileRoute("/carreira/$careerId/propostas")({
  component: PropostasPage,
});

function PropostasPage() {
  const { career, club, refresh } = useCareer();
  const { careerId } = useParams({ from: "/carreira/$careerId/propostas" });
  const [offers, setOffers] = useState<IncomingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("incoming_offers")
      .select("*")
      .eq("career_id", careerId)
      .order("created_at", { ascending: false });
    setOffers((data ?? []) as IncomingRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [careerId]);

  const accept = async (offer: IncomingRow) => {
    if (offer.offer_type === "buy") {
      // Vende o jogador
      await supabase.from("squad_players").delete().eq("id", offer.player_id);
      // Recupera o salário do jogador para abater da folha
      const { data: existing } = await supabase
        .from("squad_players")
        .select("weekly_wage_eur")
        .eq("id", offer.player_id)
        .maybeSingle();
      const wageRemoved = existing?.weekly_wage_eur ?? 0;
      await supabase.from("careers").update({
        cash_eur: career.cash_eur + offer.fee_eur + offer.bonus_eur,
        weekly_wages_eur: Math.max(0, career.weekly_wages_eur - wageRemoved),
        updated_at: new Date().toISOString(),
      }).eq("id", career.id);
      await supabase.from("news_feed").insert({
        career_id: career.id,
        user_id: career.user_id,
        kind: "transfer",
        title: `${offer.player_name} é vendido para o ${offer.from_club}`,
        body: `${club.name} acerta a saída de ${offer.player_name} por ${formatEur(offer.fee_eur)} (+${formatEur(offer.bonus_eur)} em bônus).`,
      });
      toast.success(`${offer.player_name} vendido!`);
    } else {
      // Empréstimo: jogador sai temporariamente, ganha o bônus
      await supabase.from("squad_players").update({ injured: true }).eq("id", offer.player_id);
      await supabase.from("careers").update({
        cash_eur: career.cash_eur + offer.bonus_eur,
        updated_at: new Date().toISOString(),
      }).eq("id", career.id);
      await supabase.from("news_feed").insert({
        career_id: career.id,
        user_id: career.user_id,
        kind: "transfer",
        title: `${offer.player_name} é emprestado ao ${offer.from_club}`,
        body: `${club.name} libera ${offer.player_name} por empréstimo. Bônus: ${formatEur(offer.bonus_eur)}.`,
      });
      toast.success(`${offer.player_name} emprestado!`);
    }
    await supabase.from("incoming_offers").update({ status: "accepted" }).eq("id", offer.id);
    await refresh();
    await load();
  };

  const reject = async (offer: IncomingRow) => {
    await supabase.from("incoming_offers").update({ status: "rejected" }).eq("id", offer.id);
    // Reação do jogador se ele tinha muito interesse
    if (offer.player_interest >= 80) {
      await supabase.from("squad_players").update({ morale: 35 }).eq("id", offer.player_id);
      await supabase.from("news_feed").insert({
        career_id: career.id,
        user_id: career.user_id,
        kind: "drama",
        title: `${offer.player_name} fica insatisfeito com recusa`,
        body: `Após a diretoria recusar a proposta do ${offer.from_club}, ${offer.player_name} demonstrou descontentamento. Moral em queda.`,
      });
      toast.warning(`${offer.player_name} ficou desmotivado.`);
    } else {
      toast.success("Proposta recusada.");
    }
    await load();
  };

  const counter = async (offer: IncomingRow, newFee: number, newBonus: number) => {
    // Contraproposta: o clube interessado aceita ou recusa baseado em quanto subiu
    const totalNew = newFee + newBonus;
    const totalOld = offer.fee_eur + offer.bonus_eur;
    const accepts = totalNew <= totalOld * 1.25; // até 25% acima eles topam
    if (accepts) {
      await supabase.from("incoming_offers").update({
        fee_eur: newFee,
        bonus_eur: newBonus,
        status: "pending",
      }).eq("id", offer.id);
      toast.success(`${offer.from_club} aceitou os novos termos. Avalie e aceite.`);
    } else {
      await supabase.from("incoming_offers").update({ status: "rejected" }).eq("id", offer.id);
      toast.error(`${offer.from_club} recusou a contraproposta.`);
    }
    await load();
  };

  const pending = offers.filter((o) => o.status === "pending");
  const history = offers.filter((o) => o.status !== "pending");

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5 text-primary" /> Propostas pelos seus jogadores</CardTitle>
          <CardDescription>
            {career.transfer_window_open
              ? `Janela aberta até a rodada ${career.transfer_window_closes_at}.`
              : "Janela fechada — apenas histórico disponível."}
          </CardDescription>
        </CardHeader>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Carregando propostas...</p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((o) => (
              <OfferCard key={o.id} offer={o} onAccept={accept} onReject={reject} onCounter={counter} disabled={!career.transfer_window_open} />
            ))}
            {pending.length === 0 && (
              <p className="md:col-span-2 text-muted-foreground">Nenhuma proposta pendente. Bom desempenho atrai os olhares.</p>
            )}
          </div>

          {history.length > 0 && (
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle className="text-base">Histórico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {history.map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-md border border-border/40 bg-background/30 px-3 py-2">
                    <span>
                      <strong>{o.from_club}</strong> por {o.player_name} — {formatEur(o.fee_eur)}
                    </span>
                    <Badge variant={o.status === "accepted" ? "default" : "destructive"}>{o.status === "accepted" ? "Aceita" : "Recusada"}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function OfferCard({
  offer, onAccept, onReject, onCounter, disabled,
}: {
  offer: IncomingRow;
  onAccept: (o: IncomingRow) => Promise<void>;
  onReject: (o: IncomingRow) => Promise<void>;
  onCounter: (o: IncomingRow, fee: number, bonus: number) => Promise<void>;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{offer.from_club}</p>
            <p className="text-lg font-bold">{offer.player_name}</p>
          </div>
          <Badge variant={offer.offer_type === "buy" ? "default" : "secondary"}>
            {offer.offer_type === "buy" ? "Compra" : "Empréstimo"}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat label="Valor" value={formatEur(offer.fee_eur)} />
          <Stat label="Bônus" value={formatEur(offer.bonus_eur)} />
          <Stat label="Salário ofertado" value={`${formatEur(offer.wage_offered_eur)}/sem`} />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Heart className="h-3.5 w-3.5 text-destructive" />
          <span className="text-muted-foreground">Interesse do jogador:</span>
          <strong>{offer.player_interest}%</strong>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={async () => { setBusy(true); await onAccept(offer); setBusy(false); }} disabled={busy || disabled}>
            <Check className="mr-1 h-4 w-4" /> Aceitar
          </Button>
          <Button size="sm" variant="outline" onClick={async () => { setBusy(true); await onReject(offer); setBusy(false); }} disabled={busy}>
            <X className="mr-1 h-4 w-4" /> Recusar
          </Button>
          <CounterDialog offer={offer} onCounter={onCounter} disabled={disabled} />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/40 bg-background/30 p-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function CounterDialog({ offer, onCounter, disabled }: { offer: IncomingRow; onCounter: (o: IncomingRow, fee: number, bonus: number) => Promise<void>; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [fee, setFee] = useState(Math.round(offer.fee_eur * 1.15));
  const [bonus, setBonus] = useState(offer.bonus_eur);
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" disabled={disabled}>
          <Handshake className="mr-1 h-4 w-4" /> Negociar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contraproposta — {offer.player_name}</DialogTitle>
          <DialogDescription>Peça mais ao {offer.from_club}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Valor pedido (€)</Label>
            <Input type="number" value={fee} onChange={(e) => setFee(parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>Bônus (€)</Label>
            <Input type="number" value={bonus} onChange={(e) => setBonus(parseInt(e.target.value) || 0)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={async () => { setBusy(true); await onCounter(offer, fee, bonus); setBusy(false); setOpen(false); }} disabled={busy} className="w-full">
            {busy ? "Enviando..." : "Enviar contraproposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}