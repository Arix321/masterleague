import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Trophy, Newspaper, Users, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Minha Liga — Modo Carreira interativo" },
      { name: "description", content: "Assuma um clube, controle todos os resultados, gerencie o mercado e viva uma carreira de futebol narrativa." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/carreiras" });
    }
  }, [loading, user, navigate]);

  return (
    <main className="min-h-screen">
      <section className="container mx-auto grid gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div className="flex flex-col justify-center gap-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Modo carreira interativo
          </div>
          <h1 className="text-5xl font-black leading-tight tracking-tight md:text-6xl">
            Você dirige o clube.<br />
            <span className="bg-gradient-gold bg-clip-text text-transparent">A liga reage.</span>
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            Inspirado em Minha Liga do eFootball. Escolha um clube, escale seu time, registre cada resultado, negocie no mercado e responda à imprensa. Nada é simulado — cada decisão é sua.
          </p>
          <ul className="grid gap-3 text-sm md:grid-cols-2">
            <Feature icon={<Trophy className="h-4 w-4" />} label="Controle total dos resultados" />
            <Feature icon={<Users className="h-4 w-4" />} label="Elencos atualizados 2025/26" />
            <Feature icon={<ShieldCheck className="h-4 w-4" />} label="Mercado com 6 grandes clubes" />
            <Feature icon={<Newspaper className="h-4 w-4" />} label="Imprensa, torcida e diretoria" />
          </ul>
        </div>

        <div className="flex items-center justify-center">
          <AuthCard />
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 backdrop-blur">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">{icon}</span>
      <span className="font-medium text-foreground">{label}</span>
    </li>
  );
}

function AuthCard() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Bem-vindo, técnico!");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { manager_name: name || email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Conta criada. Já pode entrar.");
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google");
    setBusy(false);
    if (result.error) toast.error(result.error.message);
  };

  return (
    <Card className="w-full max-w-md border-border/60 bg-card/80 shadow-card backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl">Entrar no vestiário</CardTitle>
        <CardDescription>Acesse sua carreira ou crie uma nova.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="mt-4">
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">E-mail</Label>
                <Input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="treinador@clube.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-pass">Senha</Label>
                <Input id="login-pass" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy} className="w-full">Entrar</Button>
            </form>
          </TabsContent>
          <TabsContent value="signup" className="mt-4">
            <form onSubmit={handleSignup} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="su-name">Nome do técnico</Label>
                <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="José Mourinho" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-email">E-mail</Label>
                <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-pass">Senha</Label>
                <Input id="su-pass" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy} className="w-full">Criar conta</Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
        </div>

        <Button variant="outline" disabled={busy} onClick={handleGoogle} className="w-full">
          Entrar com Google
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Ao continuar, você inicia uma carreira sua. <Link to="/" className="text-primary hover:underline">Saiba mais</Link>.
        </p>
      </CardContent>
    </Card>
  );
}
