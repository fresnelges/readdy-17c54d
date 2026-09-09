
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SEAWEEDFS_ENDPOINT = "https://seaweedfs-oriq.srv1134875.hstgr.cloud/";
const ACCESS_KEY = "475EaexzEXNjXUtZFxBR";
const SECRET_KEY = "fQDZDREd3jtDsmyQ5vnGe7TjIKO8FFTq";
const BUCKET = "product-media";
const REGION = "us-east-1";
const SERVICE = "s3";

const MAX_IMAGE_BYTES = 1 * 1024 * 1024;
const MAX_VIDEO_BYTES = 15 * 1024 * 1024;

function log(level: string, message: string, data?: unknown): void {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 23);
  const prefix = `[${ts}] [${level.toUpperCase()}] [SeaweedFS]`;
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
  method: string,
  path: string,
  query: string,
  headers: Record<string, string>,
  payload: Uint8Array,
  dateAmz: string,
  dateStamp: string,
): Promise<string> {
  const signedHeaders = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort()
    .join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((k) => `${k.toLowerCase()}:${headers[k].trim()}`)
    .join("\n") + "\n";
  const payloadHash = await sha256(payload);
  const canonicalRequest = [method, path, query, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", dateAmz, credentialScope, await sha256(canonicalRequest)].join("\n");
  const signingKey = await getSignatureKey(SECRET_KEY, dateStamp, REGION, SERVICE);
  const signature = hexEncode(await hmac(signingKey, stringToSign));
  return `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function buildAuthHeaders(
  method: string, s3Path: string, payload: Uint8Array, extraHeaders: Record<string, string> = {},
): { headers: Record<string, string>; dateAmz: string; dateStamp: string; payloadHash: Promise<string> } {
  const now = new Date();
  const dateAmz = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = dateAmz.slice(0, 8);
  const host = new URL(SEAWEEDFS_ENDPOINT).host;
  const payloadHash = sha256(payload);
  const headers: Record<string, string> = {
    "Host": host,
    "x-amz-content-sha256": "",
    "x-amz-date": dateAmz,
    ...extraHeaders,
  };
  return { headers, dateAmz, dateStamp, payloadHash };
}

async function signAndSend(
  method: string, s3Path: string, extraHeaders: Record<string, string>, payload: Uint8Array,
): Promise<Response> {
  const bh = buildAuthHeaders(method, s3Path, payload, extraHeaders);
  bh.headers["x-amz-content-sha256"] = await bh.payloadHash;
  const authorization = await signRequest(method, s3Path, "", bh.headers, payload, bh.dateAmz, bh.dateStamp);
  bh.headers["Authorization"] = authorization;
  const url = `${SEAWEEDFS_ENDPOINT.replace(/\/$/, "")}${s3Path}`;
  return await fetch(url, {
    method,
    headers: bh.headers,
    body: method === "GET" || method === "HEAD" ? undefined : payload,
  });
}

async function bucketExists(): Promise<boolean> {
  log("info", "Verification existence du bucket", { bucket: BUCKET });
  const emptyPayload = new Uint8Array(0);
  const bh = buildAuthHeaders("HEAD", `/${BUCKET}`, emptyPayload);
  bh.headers["x-amz-content-sha256"] = await bh.payloadHash;
  const authorization = await signRequest("HEAD", `/${BUCKET}`, "", bh.headers, emptyPayload, bh.dateAmz, bh.dateStamp);
  bh.headers["Authorization"] = authorization;
  const url = `${SEAWEEDFS_ENDPOINT.replace(/\/$/, "")}/${BUCKET}`;
  const resp = await fetch(url, { method: "HEAD", headers: bh.headers });
  log("info", "Bucket check", { status: resp.status });
  return resp.ok || resp.status === 301;
}

async function createBucket(): Promise<boolean> {
  log("info", "Creation du bucket", { bucket: BUCKET });
  const emptyPayload = new Uint8Array(0);
  const resp = await signAndSend("PUT", `/${BUCKET}`, {}, emptyPayload);
  const ok = resp.ok || resp.status === 409;
  if (ok) {
    log("info", "Bucket OK", { status: resp.status });
  } else {
    const body = await resp.text().catch(() => "");
    log("error", "Echec creation bucket", { status: resp.status, body: body.slice(0, 300) });
  }
  return ok;
}

async function ensureBucket(): Promise<void> {
  const exists = await bucketExists();
  if (!exists) {
    log("info", "Bucket absent, creation en cours...");
    const created = await createBucket();
    if (!created) throw new Error(`Impossible de creer le bucket "${BUCKET}" dans SeaweedFS`);
    log("info", "Bucket cree avec succes !");
  } else {
    log("info", "Bucket deja present");
  }
}

async function uploadToSeaweedFS(
  fileData: Uint8Array, fileName: string, contentType: string, folder: string,
): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
  const safeName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const objectPath = `${folder}/${safeName}`;
  const s3Path = `/${BUCKET}/${objectPath}`;
  const extraHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "x-amz-acl": "public-read",
  };
  log("info", "Envoi vers SeaweedFS", { objectPath, size: fileData.length, contentType });
  const resp = await signAndSend("PUT", s3Path, extraHeaders, fileData);
  if (!resp.ok) {
    const errorBody = await resp.text().catch(() => "");
    log("error", "SeaweedFS upload echoue", { status: resp.status, error: errorBody.slice(0, 300) });
    throw new Error(`SeaweedFS a retourne ${resp.status}: ${errorBody.slice(0, 200)}`);
  }
  log("info", "Upload OK vers SeaweedFS", { objectPath });
  return `${SEAWEEDFS_ENDPOINT.replace(/\/$/, "")}/${BUCKET}/${objectPath}`;
}

serve(async (req: Request) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  log("info", `Requete [${requestId}]`, { method: req.method, ct: req.headers.get("content-type") });

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

  try {
    await ensureBucket();

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
      return new Response(JSON.stringify({ error: `Fichier trop volumineux (${limitLabel} max)` }), {
        status: 413,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    log("info", `Upload [${requestId}]`, {
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} Ko`,
      type: file.type,
      folder,
    });

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const publicUrl = await uploadToSeaweedFS(uint8, file.name, file.type, folder);

    log("info", `Termine [${requestId}]`, { url: publicUrl });

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", `Exception [${requestId}]`, { error: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
