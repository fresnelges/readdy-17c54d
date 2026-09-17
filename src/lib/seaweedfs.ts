const SEAWEEDFS_ENDPOINT = "https://seaweedfs-oriq.srv1134875.hstgr.cloud/";
const SEAWEEDFS_BUCKET = "product-media";
const ACCESS_KEY = "475EaexzEXNjXUtZFxBR";
const SECRET_KEY = "fQDZDREd3jtDsmyQ5vnGe7TjIKO8FFTq";
const REGION = "us-east-1";
const SERVICE = "s3";

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
  s3Path: string,
  query: string,
  headers: Record<string, string>,
  payloadHash: string,
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

  const canonicalRequest = [
    method,
    s3Path,
    query,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    dateAmz,
    credentialScope,
    await sha256(canonicalRequest),
  ].join("\n");

  const signingKey = await getSignatureKey(SECRET_KEY, dateStamp, REGION, SERVICE);
  const signature = hexEncode(await hmac(signingKey, stringToSign));

  return `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

async function signedFetch(
  method: string,
  s3Path: string,
  queryString: string,
  extraHeaders: Record<string, string> = {},
  body: Uint8Array = new Uint8Array(0),
): Promise<Response> {
  const now = new Date();
  const dateAmz = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = dateAmz.slice(0, 8);
  const host = new URL(SEAWEEDFS_ENDPOINT).host;

  // Le hash du contenu n'est calculé qu'une seule fois, puis réutilisé
  // pour l'en-tête x-amz-content-sha256 ET pour la signature de la requête.
  const payloadHash = await sha256(body);

  const headers: Record<string, string> = {
    "Host": host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": dateAmz,
    ...extraHeaders,
  };

  const authorization = await signRequest(
    method, s3Path, queryString, headers, payloadHash, dateAmz, dateStamp,
  );
  headers["Authorization"] = authorization;

  const fullPath = s3Path.startsWith("/") ? s3Path : `/${SEAWEEDFS_BUCKET}${s3Path}`;
  const url = `${SEAWEEDFS_ENDPOINT.replace(/\/$/, "")}${fullPath}${queryString ? "?" + queryString : ""}`;

  return await fetch(url, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" || method === "DELETE" ? undefined : body,
  });
}

export interface SeaweedFile {
  key: string;
  url: string;
  size: number;
  sizeFormatted: string;
  lastModified: string;
  folder: string;
  filename: string;
  extension: string;
  type: "image" | "video" | "other";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// Dossier personnel d'un utilisateur dans le bucket SeaweedFS.
// Tous les fichiers Médias d'un compte vivent sous users/{userId}/...
// ce qui permet de lister par compte et de les rattacher au quota global.
export function getUserMediaFolder(userId: number): string {
  return `users/${userId}`;
}

// Nettoie le nom original pour produire une clé S3 sûre tout en restant lisible
function sanitizeFileName(fileName: string): string {
  const dotIdx = fileName.lastIndexOf('.');
  const base = dotIdx > 0 ? fileName.slice(0, dotIdx) : fileName;
  const ext = dotIdx > 0 ? fileName.slice(dotIdx + 1).toLowerCase() : 'bin';
  const clean =
    base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'fichier';
  return `${clean}-${crypto.randomUUID().slice(0, 6)}.${ext}`;
}

export async function uploadToSeaweedFS(
  fileData: Uint8Array,
  fileName: string,
  contentType: string,
  folder: string,
): Promise<string> {
  const safeName = sanitizeFileName(fileName);
  const objectPath = `${folder}/${safeName}`;
  const s3Path = `/${SEAWEEDFS_BUCKET}/${objectPath}`;

  const resp = await signedFetch("PUT", s3Path, "", {
    "Content-Type": contentType,
    "x-amz-acl": "public-read",
  }, fileData);

  if (!resp.ok) {
    const errorBody = await resp.text().catch(() => "");
    throw new Error(`SeaweedFS a retourne ${resp.status}: ${errorBody.slice(0, 200)}`);
  }

  return `${SEAWEEDFS_ENDPOINT.replace(/\/$/, "")}/${SEAWEEDFS_BUCKET}/${objectPath}`;
}

// Récupère le contenu brut d'un objet (pour conversion / déplacement)
export async function getFileBytes(key: string): Promise<ArrayBuffer> {
  const resp = await signedFetch("GET", `/${SEAWEEDFS_BUCKET}/${key}`, "");
  if (!resp.ok) {
    throw new Error(`Erreur de lecture: ${resp.status}`);
  }
  return await resp.arrayBuffer();
}

// Déplace un fichier vers un autre dossier (conserve le même nom de fichier)
export async function moveFile(oldKey: string, newFolder: string): Promise<string> {
  const bytes = await getFileBytes(oldKey);
  const filename = oldKey.split("/").pop() || "fichier";
  const objectPath = `${newFolder}/${filename}`;
  const s3Path = `/${SEAWEEDFS_BUCKET}/${objectPath}`;

  const resp = await signedFetch("PUT", s3Path, "", {
    "Content-Type": "application/octet-stream",
    "x-amz-acl": "public-read",
  }, bytes);

  if (!resp.ok) {
    throw new Error(`Erreur de déplacement: ${resp.status}`);
  }

  await deleteFile(oldKey);
  return `${SEAWEEDFS_ENDPOINT.replace(/\/$/, "")}/${SEAWEEDFS_BUCKET}/${objectPath}`;
}

export async function listFiles(prefix: string): Promise<{
  files: SeaweedFile[];
  folders: string[];
  totalSize: number;
  totalSizeFormatted: string;
}> {
  const queryParts: string[] = ["list-type=2"];
  if (prefix) queryParts.push(`prefix=${encodeURIComponent(prefix)}`);

  const resp = await signedFetch("GET", `/${SEAWEEDFS_BUCKET}`, queryParts.join("&"));

  if (resp.status === 404) {
    return { files: [], folders: [], totalSize: 0, totalSizeFormatted: "0 o" };
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Erreur listage: ${resp.status} - ${body.slice(0, 200)}`);
  }

  const xmlBody = await resp.text();
  const files = parseXmlListResponse(xmlBody);

  const folderSet = new Set<string>();
  files.forEach((f) => { if (f.folder) folderSet.add(f.folder); });
  const folders = Array.from(folderSet).sort();
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return {
    files,
    folders,
    totalSize,
    totalSizeFormatted: formatFileSize(totalSize),
  };
}

export async function deleteFile(key: string): Promise<boolean> {
  const resp = await signedFetch("DELETE", `/${SEAWEEDFS_BUCKET}/${key}`, "");
  return resp.ok || resp.status === 204;
}

function parseXmlListResponse(xml: string): SeaweedFile[] {
  const entries: SeaweedFile[] = [];
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

    let type: SeaweedFile["type"] = "other";
    if (["jpg","jpeg","png","gif","webp","svg","bmp","ico"].includes(ext)) type = "image";
    else if (["mp4","webm","mov","avi","mkv"].includes(ext)) type = "video";

    entries.push({
      key,
      url: `${SEAWEEDFS_ENDPOINT.replace(/\/$/, "")}/${SEAWEEDFS_BUCKET}/${key}`,
      size,
      sizeFormatted: formatFileSize(size),
      lastModified,
      folder,
      filename,
      extension: ext,
      type,
    });
  }

  return entries;
}