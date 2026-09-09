import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "product-media";

serve(async (_req: Request) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: buckets, error: listErr } = await supabaseAdmin.storage.listBuckets();

    if (listErr) {
      return new Response(
        JSON.stringify({ error: "Impossible de lister les buckets: " + listErr.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const exists = buckets?.some((b: { name: string }) => b.name === BUCKET);

    if (exists) {
      return new Response(
        JSON.stringify({ message: "Bucket deja existant", bucket: BUCKET, created: false }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 15728640,
      allowedMimeTypes: [
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "video/mp4", "video/webm",
      ],
    });

    if (createErr) {
      return new Response(
        JSON.stringify({ error: "Echec creation bucket: " + createErr.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ message: "Bucket cree avec succes", bucket: BUCKET, created: true }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erreur interne: " + (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});