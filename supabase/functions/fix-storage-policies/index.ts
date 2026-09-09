import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results: string[] = [];

    // Check existing policies
    const { data: existingPolicies, error: checkErr } = await supabase
      .from("pg_policies")
      .select("policyname, cmd")
      .eq("schemaname", "storage")
      .eq("tablename", "objects")
      .ilike("policyname", "%product-media%");

    results.push(`Existing: ${JSON.stringify(existingPolicies ?? [])} | err: ${checkErr?.message ?? "none"}`);

    // Create INSERT policy
    const { error: insErr } = await supabase.rpc("create_storage_policy", {
      p_name: "Allow public uploads to product-media",
      p_operation: "INSERT",
      p_definition: "(bucket_id = 'product-media'::text)",
      p_check: "(bucket_id = 'product-media'::text)",
    }).catch(() => ({ error: null }));

    if (insErr) {
      // Direct SQL fallback
      const { error: rawErr } = await supabase.rpc("exec_raw_sql", {
        query: `CREATE POLICY "Allow public uploads to product-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-media');`
      }).catch(() => ({ error: null }));
      results.push(`INSERT (raw): ${rawErr ? "FAILED: " + rawErr.message : "OK"}`);
    } else {
      results.push("INSERT policy: OK via RPC");
    }

    // Create SELECT policy
    const { error: selErr } = await supabase.rpc("create_storage_policy", {
      p_name: "Allow public reads from product-media",
      p_operation: "SELECT",
      p_definition: "(bucket_id = 'product-media'::text)",
      p_check: "(bucket_id = 'product-media'::text)",
    }).catch(() => ({ error: null }));

    if (selErr) {
      const { error: rawErr } = await supabase.rpc("exec_raw_sql", {
        query: `CREATE POLICY "Allow public reads from product-media" ON storage.objects FOR SELECT USING (bucket_id = 'product-media');`
      }).catch(() => ({ error: null }));
      results.push(`SELECT (raw): ${rawErr ? "FAILED: " + rawErr.message : "OK"}`);
    } else {
      results.push("SELECT policy: OK via RPC");
    }

    // Verify
    const { data: verify } = await supabase
      .from("pg_policies")
      .select("policyname, cmd")
      .eq("schemaname", "storage")
      .eq("tablename", "objects")
      .ilike("policyname", "%product-media%");

    results.push(`Final: ${JSON.stringify(verify ?? [])}`);

    return new Response(
      JSON.stringify({ success: true, policies: verify, results }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});