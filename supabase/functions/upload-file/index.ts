import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "product-media";
const MAX_IMAGE_BYTES = 1 * 1024 * 1024;
const MAX_VIDEO_BYTES = 15 * 1024 * 1024;

function log(level: string, message: string, data?: unknown): void {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 23);
  const prefix = `[${ts}] [${level.toUpperCase()}] [EdgeUpload]`;
  const extra = data ? " " + JSON.stringify(data) : "";
  console.log(prefix + " " + message + extra);
}

async function ensureBucket(supabase: ReturnType<typeof createClient>): Promise<{ ok: boolean; error?: string }> {
  log("info", "Verification du bucket: " + BUCKET);

  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    log("error", "List buckets echouee", { error: listErr.message });
    return { ok: false, error: "Storage inaccessible: " + listErr.message };
  }

  const bucketNames = (buckets || []).map((b: { name: string }) => b.name);
  log("info", "Buckets trouves: " + bucketNames.join(", ") || "(aucun)");

  if (bucketNames.includes(BUCKET)) {
    log("info", "Bucket existe deja");
    return { ok: true };
  }

  log("info", "Creation du bucket: " + BUCKET);
  const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 15728640,
    allowedMimeTypes: [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "video/mp4", "video/webm",
    ],
  });

  if (createErr) {
    log("error", "Creation bucket echouee", { error: createErr.message });
    return { ok: false, error: "Creation bucket impossible: " + createErr.message };
  }

  // Verifie que le bucket est bien cree
  const { data: buckets2, error: listErr2 } = await supabase.storage.listBuckets();
  if (listErr2) {
    log("error", "Re-verification echouee", { error: listErr2.message });
    return { ok: false, error: "Bucket cree mais inaccessible" };
  }

  const created = (buckets2 || []).some((b: { name: string }) => b.name === BUCKET);
  if (!created) {
    log("error", "Bucket introuvable apres creation");
    return { ok: false, error: "Bucket non trouve apres creation" };
  }

  log("info", "Bucket cree et verifie!");
  return { ok: true };
}

serve(async (req: Request) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  log("info", "Requete [" + requestId + "]", {
    method: req.method,
    ct: req.headers.get("content-type"),
  });

  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, X-Client-Info",
        },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Methode non autorisee" }), {
        status: 405,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Configuration serveur incomplete" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // -- Etape 1: S'assurer que le bucket existe --
    const bucketCheck = await ensureBucket(supabase);
    if (!bucketCheck.ok) {
      return new Response(JSON.stringify({ error: bucketCheck.error }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // -- Etape 2: Parser le FormData --
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return new Response(JSON.stringify({ error: "Formulaire illisible" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return new Response(JSON.stringify({ error: "Aucun fichier fourni" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxSize) {
      const limitLabel = isVideo ? "15 Mo" : "1 Mo";
      return new Response(JSON.stringify({ error: "Fichier trop volumineux (" + limitLabel + " max)" }), {
        status: 413,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeName = Date.now() + "-" + crypto.randomUUID().slice(0, 8) + "." + ext;
    const filePath = folder + "/" + safeName;

    log("info", "Upload [" + requestId + "]", {
      name: file.name,
      size: (file.size / 1024).toFixed(1) + " Ko",
      path: filePath,
      bucket: BUCKET,
    });

    // -- Etape 3: Upload via le client Supabase --
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, uint8, {
        contentType: file.type,
        cacheControl: "max-age=3600",
        upsert: true,
      });

    if (uploadErr) {
      log("error", "Upload echoue [" + requestId + "]", { error: uploadErr.message, path: filePath });
      return new Response(
        JSON.stringify({
          error: "Echec du telechargement: " + uploadErr.message,
          diagnostics: { bucket: BUCKET, filePath },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    log("info", "Upload OK [" + requestId + "]", { path: uploadData?.path || filePath });

    // -- Etape 4: Generer l'URL publique --
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl || `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filePath}`;

    log("info", "Termine [" + requestId + "]", { url: publicUrl });

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", "Exception [" + requestId + "]", { error: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});