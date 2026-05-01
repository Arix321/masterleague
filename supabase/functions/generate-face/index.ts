import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FaceRequest {
  playerId: string;
  name: string;
  age: number;
  position: string;
}

function buildPrompt(p: FaceRequest) {
  const ageDesc = p.age <= 21 ? "young, around 20 years old"
    : p.age <= 28 ? "young adult in mid-20s"
    : p.age <= 33 ? "experienced adult around 30"
    : "veteran in his late 30s, with some grey hair";
  return [
    "Cartoon-style portrait illustration of a male professional soccer player,",
    "head and shoulders only, looking straight at the camera, friendly confident expression.",
    `The player is ${ageDesc}, named ${p.name}.`,
    "Modern flat illustration, clean vibrant colors, vivid skin tones, soft studio lighting,",
    "plain solid neutral background (dark green or navy), no text, no logos, no jersey numbers.",
    "Style similar to FIFA Ultimate Team cartoon avatars or eFootball illustrated cards.",
    "High quality, sharp lines, expressive eyes, square framing.",
  ].join(" ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as FaceRequest;
    if (!body.playerId || !body.name) {
      return new Response(JSON.stringify({ error: "Missing playerId or name" }), {
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

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Already has a face? Return cached.
    const { data: existing } = await admin
      .from("squad_players")
      .select("face_url, user_id")
      .eq("id", body.playerId)
      .maybeSingle();
    if (!existing || existing.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Player not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (existing.face_url) {
      return new Response(JSON.stringify({ face_url: existing.face_url, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de IA atingido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Falha ao gerar face." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await aiResp.json();
    const dataUrl: string | undefined = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl?.startsWith("data:image/")) throw new Error("No image in AI response");

    const [meta, b64] = dataUrl.split(",");
    const mime = meta.match(/data:(image\/[a-z]+)/)?.[1] ?? "image/png";
    const ext = mime.split("/")[1] ?? "png";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const path = `${userId}/${body.playerId}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("player-faces")
      .upload(path, bytes, { contentType: mime, upsert: true });
    if (upErr) throw upErr;

    const { data: pub } = admin.storage.from("player-faces").getPublicUrl(path);
    const face_url = pub.publicUrl;

    await admin.from("squad_players").update({ face_url }).eq("id", body.playerId);

    return new Response(JSON.stringify({ face_url, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-face error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});