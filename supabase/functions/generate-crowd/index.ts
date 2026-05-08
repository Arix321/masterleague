import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CrowdRequest {
  mood: "win" | "loss" | "draw" | "derby_win" | "derby_loss";
  clubName: string;
  scoreline?: string;
}

function buildPrompt(p: CrowdRequest) {
  const moodLine =
    p.mood === "win" ? "Massive ecstatic crowd celebrating wildly, arms raised, scarves and flags waving, fireworks and confetti, pure joy on faces, golden lights."
    : p.mood === "derby_win" ? "Wild euphoric ultras stand erupting after a derby win, smoke flares, giant flags, fans hugging and screaming with tears of joy."
    : p.mood === "loss" ? "Devastated crowd in the stands, fans with hands on heads, sad and disappointed expressions, some crying, dim cold lighting, empty seats nearby."
    : p.mood === "derby_loss" ? "Crushed ultras after losing a derby, heads down, scarves drooping, anger and sadness mixed, dark moody atmosphere."
    : "Mixed crowd in the stadium, neutral and tense expressions after a draw, some clapping politely, some disappointed, dusk lighting.";
  return [
    "Cinematic wide-angle photo-illustration of a soccer stadium crowd reaction.",
    moodLine,
    `Stadium of ${p.clubName}, generic supporters in club-style colors (no real logos, no readable text).`,
    "Cartoon-illustrated style, vibrant colors, dramatic lighting, expressive faces, no text, no logos, no jersey numbers.",
    "Composition: thousands of fans visible, focus on a few in the foreground.",
    "16:9 framing.",
  ].join(" ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as CrowdRequest;
    if (!body.mood || !body.clubName) {
      return new Response(JSON.stringify({ error: "Missing mood or clubName" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: buildPrompt(body) }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      const status = aiResp.status === 429 || aiResp.status === 402 ? aiResp.status : 500;
      return new Response(JSON.stringify({ error: "Falha ao gerar imagem da torcida." }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await aiResp.json();
    const dataUrl: string | undefined = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl?.startsWith("data:image/")) throw new Error("No image in AI response");

    const [meta, b64] = dataUrl.split(",");
    const mime = meta.match(/data:(image\/[a-z]+)/)?.[1] ?? "image/png";
    const ext = mime.split("/")[1] ?? "png";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("crowd-images")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (upErr) throw upErr;

    const { data: pub } = admin.storage.from("crowd-images").getPublicUrl(path);
    return new Response(JSON.stringify({ image_url: pub.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-crowd error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});