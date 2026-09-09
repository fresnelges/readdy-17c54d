
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SEAWEEDFS_ENDPOINT = "https://seaweedfs-oriq.srv1134875.hstgr.cloud/";
const ACCESS_KEY = "475EaexzEXNjXUtZFxBR";
const SECRET_KEY = "fQDZDREd3jtDsmyQ5vnGe7TjIKO8FFTq";
const BUCKET = "product-media";
const REGION = "us-east-1";
const SERVICE = "s3";

function log(level: string, message: string, data?: unknown): void {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 23);
  const prefix = `[${ts}] [${level.toUpperCase()}] [ListFiles]`;
  const extra = data ? " " + JSON.stringify(data) : "";
  console.log(prefix + " " + message + extra);
}

function hexEncode(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(data: string | Uint8Array): Promise<string> {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return hexEncode(hash);
}

async function hmac(secret: Uint8Array, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

async function getSignatureKey(
  secretKey: string, dateStamp: string, region: string, service: string
): Promise<Uint8Array> {
  const kDate = await hmac(new TextEncoder().encode("AWS4" + secretKey), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");
  return kSigning;
}

async function signRequest(
  method: string, path: string, query: string,
  headers: Record<string, string>, payload: Uint8Array,
  dateAmz: string, dateStamp: string,
): Promise<string> {
  const signedHeaders = Object.keys(headers).map((k) => k.toLowerCase()).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((k) => `${k.toLowerCase()}:${headers[k].trim()}`).join("\n") + "\n";
  const payloadHash = await sha256(payload);
  const canonicalRequest = [method, path, query, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", dateAmz, credentialScope, await sha256(canonicalRequest)].join("\n");
  const signingKey = await getSignatureKey(SECRET_KEY, dateStamp, REGION, SERVICE);
  const signature = hexEncode(await hmac(signingKey, stringToSign));
  return `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

async function signedFetch(
  method: string, s3Path: string, queryString: string,
  extraHeaders: Record<string, string> = {}, body: Uint8Array = new Uint8Array(0),
): Promise<Response> {
  const now = new Date();
  const dateAmz = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = dateAmz.slice(0, 8);
  const host = new URL(SEAWEEDFS_ENDPOINT).host;
  const headers: Record<string, string> = {
    "Host": host,
    "x-amz-content-sha256": await sha256(body),
    "x-amz-date": dateAmz,
    ...extraHeaders,
  };
  const authorization = await signRequest(method, s3Path, queryString, headers, body, dateAmz, dateStamp);
  headers["Authorization"] = authorization;
  const url = `${SEAWEEDFS_ENDPOINT.replace(/\/$/, "")}${s3Path}${queryString ? "?" + queryString : ""}`;
  return await fetch(url, { method, headers, body: method === "GET" || method === "HEAD" ? undefined : body });
}

interface FileEntry {
  key: string; url: string; size: number; sizeFormatted: string;
  lastModified: string; folder: string; filename: string;
  extension: string; type: "image" | "video" | "other";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function parseXmlListResponse(xml: string): FileEntry[] {
  const entries: FileEntry[] = [];
  const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match;
  while ((match = contentsRegex.exec(xml)) !== null) {
    const block = match[1];
    const keyMatch = block.match(/<Key>([^<]+)<\/Key>/);
    const sizeMatch = block.match(/<Size>(\d+)<\/Size>/);
    const dateMatch = block.match(/<LastModified>([^<]+)<\/LastModified>/);
    if (!keyMatch) continue;
    const key = keyMatch[1];
    if (key.endsWith("/")) continue;
    const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;
    const lastModified = dateMatch ? dateMatch[1] : "";
    const parts = key.split("/");
    const filename = parts[parts.length - 1] || key;
    const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    let type: FileEntry["type"] = "other";
    if (["jpg","jpeg","png","gif","webp","svg","bmp","ico"].includes(ext)) type = "image";
    else if (["mp4","webm","mov","avi","mkv"].includes(ext)) type = "video";
    entries.push({
      key, url: `${SEAWEEDFS_ENDPOINT.replace(/\/$/, "")}/${BUCKET}/${key}`,
      size, sizeFormatted: formatFileSize(size), lastModified, folder, filename, extension: ext, type,
    });
  }
  return entries;
}

serve(async (req: Request) => {
  const requestId = crypto.randomUUID().slice(0, 8);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, X-Client-Info",
      },
    });
  }

  if (req.method === "GET") {
    try {
      const url = new URL(req.url);
      const prefix = url.searchParams.get("prefix") || "";
      const folder = url.searchParams.get("folder") || "";
      const effectivePrefix = folder ? `${folder}/` : (prefix || "");
      log("info", `Liste [${requestId}]`, { prefix: effectivePrefix || "(racine)" });
      const queryParts: string[] = ["list-type=2"];
      if (effectivePrefix) queryParts.push(`prefix=${encodeURIComponent(effectivePrefix)}`);
      const resp = await signedFetch("GET", `/${BUCKET}`, queryParts.join("&"));
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        log("error", `Echec liste [${requestId}]`, { status: resp.status, body: body.slice(0, 200) });
        if (resp.status === 404) {
          return new Response(JSON.stringify({
            files: [], totalSize: 0, totalFiles: 0, folders: [],
            message: "Le bucket est vide (aucun fichier)",
          }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        }
        return new Response(JSON.stringify({ error: `Erreur SeaweedFS: ${resp.status}` }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      const xmlBody = await resp.text();
      const files = parseXmlListResponse(xmlBody);
      const folderSet = new Set<string>();
      files.forEach((f) => { if (f.folder) folderSet.add(f.folder); });
      const folders = Array.from(folderSet).sort();
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      log("info", `Resultat [${requestId}]`, { files: files.length, folders: folders.length });
      return new Response(JSON.stringify({
        files, totalSize, totalSizeFormatted: formatFileSize(totalSize),
        totalFiles: files.length, folders,
      }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("error", `Exception GET [${requestId}]`, { error: msg });
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  if (req.method === "DELETE") {
    try {
      const url = new URL(req.url);
      const fileKey = url.searchParams.get("key");
      if (!fileKey) {
        return new Response(JSON.stringify({ error: "Parametre 'key' requis" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      log("info", `Suppression [${requestId}]`, { key: fileKey });
      const resp = await signedFetch("DELETE", `/${BUCKET}/${fileKey}`, "");
      if (!resp.ok && resp.status !== 204) {
        const body = await resp.text().catch(() => "");
        log("error", `Echec suppression [${requestId}]`, { status: resp.status, body: body.slice(0, 200) });
        return new Response(JSON.stringify({ error: `Erreur suppression: ${resp.status}` }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      log("info", `Supprime [${requestId}]`, { key: fileKey });
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("error", `Exception DELETE [${requestId}]`, { error: msg });
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Methode non supportee" }), {
    status: 405,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
