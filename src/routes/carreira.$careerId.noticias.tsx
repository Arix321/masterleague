import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCareer } from "@/lib/career-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronRight } from "lucide-react";

interface NewsRow { id: string; kind: string; title: string; body: string | null; created_at: string; image_url: string | null }

export const Route = createFileRoute("/carreira/$careerId/noticias")({
  component: NoticiasPage,
});

function NoticiasPage() {
  const { careerId } = useParams({ from: "/carreira/$careerId/noticias" });
  const [news, setNews] = useState<NewsRow[]>([]);
  const [open, setOpen] = useState<NewsRow | null>(null);
  void useCareer(); // garantir contexto

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("news_feed")
        .select("id, kind, title, body, created_at, image_url")
        .eq("career_id", careerId)
        .order("created_at", { ascending: false });
      setNews((data ?? []) as NewsRow[]);
    })();
  }, [careerId]);

  const kindLabel: Record<string, string> = {
    headline: "Manchete",
    press: "Coletiva",
    board: "Diretoria",
    finance: "Finanças",
    transfer: "Mercado",
    news: "Notícia",
  };

  const preview = (body: string | null) => {
    if (!body) return "";
    const plain = body.replace(/\*\*/g, "").replace(/\n+/g, " ").trim();
    return plain.length > 140 ? plain.slice(0, 140) + "..." : plain;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {news.length === 0 && <p className="text-muted-foreground">Sem notícias ainda.</p>}
      {news.map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => setOpen(n)}
          className="block w-full text-left"
        >
          <Card className="border-border/60 bg-card/70 transition hover:border-primary/50 hover:bg-card">
            {n.image_url && (
              <div className="aspect-[16/7] w-full overflow-hidden rounded-t-lg">
                <img src={n.image_url} alt={n.title} loading="lazy" className="h-full w-full object-cover" />
              </div>
            )}
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-primary/40 text-primary">{kindLabel[n.kind] ?? n.kind}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}</span>
              </div>
              <CardTitle className="text-lg leading-snug">{n.title}</CardTitle>
            </CardHeader>
            {n.body && (
              <CardContent className="flex items-center justify-between gap-3 pt-0 text-sm text-muted-foreground">
                <span className="line-clamp-2 flex-1">{preview(n.body)}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
              </CardContent>
            )}
          </Card>
        </button>
      ))}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-primary/40 text-primary">
                {open ? (kindLabel[open.kind] ?? open.kind) : ""}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {open ? new Date(open.created_at).toLocaleString("pt-BR") : ""}
              </span>
            </div>
            <DialogTitle className="text-xl leading-tight">{open?.title}</DialogTitle>
            <DialogDescription className="sr-only">Detalhes da notícia</DialogDescription>
          </DialogHeader>
          {open?.image_url && (
            <div className="overflow-hidden rounded-md">
              <img src={open.image_url} alt={open.title} className="w-full object-cover" />
            </div>
          )}
          {open?.body && (
            <div
              className="prose prose-sm prose-invert max-h-[60vh] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-foreground/90"
              dangerouslySetInnerHTML={{
                __html: open.body
                  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                  .replace(/_([^_\n]+)_/g, "<em>$1</em>")
                  .replace(/^---$/gm, "<hr class='my-2 border-border/40' />")
                  .replace(/\n/g, "<br/>"),
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}