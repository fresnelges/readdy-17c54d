import { supabase } from '@/lib/supabase';

export type DocType = 'word' | 'excel' | 'powerpoint' | 'pdf';

export interface WordComment {
  id: string;
  authorId: number;
  authorName: string;
  text: string;
  quote: string;
  createdAt: string;
  resolved: boolean;
}

export interface WordContent {
  html: string;
  comments?: WordComment[];
  header?: string;
  footer?: string;
}

export type NumFormat =
  | 'auto'
  | 'number'
  | 'currency'
  | 'accounting'
  | 'percent'
  | 'date'
  | 'datetime'
  | 'time'
  | 'custom';

export interface CellBorders {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
  color?: string;
  style?: 'thin' | 'medium' | 'thick';
}

export type CondFormatOperator =
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'eq'
  | 'neq'
  | 'between'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'notEmpty'
  | 'dateIs'
  | 'dateBefore'
  | 'dateAfter';

export interface ConditionalFormatRule {
  id: string;
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  operator: CondFormatOperator;
  value?: string;
  value2?: string;
  bg?: string;
  color?: string;
}

export interface ExcelFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  bg?: string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  wrap?: boolean;
  rotation?: number;
  fontFamily?: string;
  fontSize?: number;
  borders?: CellBorders;
  numFormat?: NumFormat;
  currencySymbol?: string;
  decimals?: number;
  customFormat?: string;
}

export interface MergeRange {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

export interface ExcelSheet {
  id: string;
  name: string;
  cells: Record<string, string>;
  rows: number;
  cols: number;
  formats?: Record<string, ExcelFormat>;
  colWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
  merges?: MergeRange[];
  conditionalFormats?: ConditionalFormatRule[];
}

export interface ExcelContent {
  sheets?: ExcelSheet[];
  activeSheetId?: string;
  // Ancien format mono-feuille (conservé pour compatibilité)
  cells?: Record<string, string>;
  rows?: number;
  cols?: number;
  formats?: Record<string, ExcelFormat>;
}

export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  x: number;
  y: number;
  w: number;
  h: number;
  html?: string;
  src?: string;
  fill?: string;
  radius?: number;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  link?: string;
}

export interface Slide {
  id: string;
  title: string;
  body: string;
  bg?: string;
  bgImage?: string;
  align?: 'left' | 'center' | 'right';
  elements?: SlideElement[];
  rich?: boolean;
  canvasW?: number;
  canvasH?: number;
}

export interface PowerPointContent {
  slides: Slide[];
}

export interface PdfContent {
  pdfBase64?: string;
  fileName?: string;
}

export interface DocDocument {
  id: number;
  user_id: string;
  name: string;
  doc_type: DocType;
  content: Record<string, unknown>;
  folder_id: number | null;
  created_at: string;
  updated_at: string;
  last_modified_by?: string | null;
}

export interface DocFolder {
  id: number;
  user_id: string;
  name: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

export const docTypeMeta: Record<DocType, { label: string; icon: string; iconClass: string }> = {
  word: { label: 'Document texte', icon: 'ri-file-word-2-line', iconClass: 'text-blue-600' },
  excel: { label: 'Feuille de calcul', icon: 'ri-file-excel-2-line', iconClass: 'text-green-600' },
  powerpoint: { label: 'Présentation', icon: 'ri-file-ppt-2-line', iconClass: 'text-orange-500' },
  pdf: { label: 'PDF', icon: 'ri-file-pdf-2-line', iconClass: 'text-red-600' },
};

export function defaultContent(type: DocType): Record<string, unknown> {
  if (type === 'pdf') return { pdfBase64: '' };
  if (type === 'excel') return { cells: {}, rows: 20, cols: 8 };
  if (type === 'powerpoint') {
    return { slides: [{ id: crypto.randomUUID(), title: 'Titre de la diapositive', body: '' }] };
  }
  return { html: '' };
}

// Convertit une chaîne base64 (PDF) en Blob prêt à afficher ou télécharger.
export function pdfBase64ToBlob(pdfBase64: string): Blob {
  const binary = atob(pdfBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function fetchDocuments(userId: number): Promise<DocDocument[]> {
  const uid = String(userId);
  const { data: own, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', uid);
  if (error) throw error;

  const { data: collabs } = await supabase
    .from('document_collaborators')
    .select('document_id')
    .eq('user_id', uid);
  const sharedIds = (collabs || []).map((c) => c.document_id);

  let shared: DocDocument[] = [];
  if (sharedIds.length > 0) {
    const { data } = await supabase.from('documents').select('*').in('id', sharedIds);
    shared = (data || []) as DocDocument[];
  }

  const map = new Map<number, DocDocument>();
  [...(own || []), ...shared].forEach((d) => map.set(d.id, d as DocDocument));
  const list = Array.from(map.values());
  list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  return list;
}

export async function createDocument(
  userId: number,
  name: string,
  type: DocType,
  folderId: number | null = null,
): Promise<DocDocument> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: String(userId),
      name,
      doc_type: type,
      content: defaultContent(type),
      folder_id: folderId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as DocDocument;
}

export async function createDocumentWithContent(
  userId: number,
  name: string,
  type: DocType,
  content: Record<string, unknown>,
  folderId: number | null = null,
): Promise<DocDocument> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: String(userId),
      name,
      doc_type: type,
      content,
      folder_id: folderId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as DocDocument;
}

export async function updateDocument(
  id: number,
  content: Record<string, unknown>,
  name?: string,
  actor?: { id: number; name: string },
): Promise<void> {
  const patch: Record<string, unknown> = { content, updated_at: new Date().toISOString() };
  if (name !== undefined) patch.name = name;
  if (actor) patch.last_modified_by = actor.name;
  const { error } = await supabase.from('documents').update(patch).eq('id', id);
  if (error) throw error;

  if (actor) {
    await supabase.from('document_versions').insert({
      document_id: id,
      user_id: String(actor.id),
      user_name: actor.name,
      content,
    });
  }
}

export async function deleteDocument(id: number): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

export async function duplicateDocument(doc: DocDocument): Promise<DocDocument> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: doc.user_id,
      name: `${doc.name} (copie)`,
      doc_type: doc.doc_type,
      content: doc.content,
      folder_id: doc.folder_id,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as DocDocument;
}

export async function renameDocument(id: number, name: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function moveDocument(id: number, folderId: number | null): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ folder_id: folderId, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchFolders(userId: number): Promise<DocFolder[]> {
  const { data, error } = await supabase
    .from('document_folders')
    .select('*')
    .eq('user_id', String(userId))
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []) as DocFolder[];
}

export async function createFolder(
  userId: number,
  name: string,
  parentId: number | null,
): Promise<DocFolder> {
  const { data, error } = await supabase
    .from('document_folders')
    .insert({ user_id: String(userId), name, parent_id: parentId })
    .select('*')
    .single();
  if (error) throw error;
  return data as DocFolder;
}

export async function renameFolder(id: number, name: string): Promise<void> {
  const { error } = await supabase
    .from('document_folders')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteFolder(id: number): Promise<void> {
  // Les documents du dossier repassent à la racine, les sous-dossiers aussi
  await supabase.from('documents').update({ folder_id: null }).eq('folder_id', id);
  await supabase.from('document_folders').update({ parent_id: null }).eq('parent_id', id);
  const { error } = await supabase.from('document_folders').delete().eq('id', id);
  if (error) throw error;
}

export async function moveFolder(id: number, parentId: number | null): Promise<void> {
  const { error } = await supabase
    .from('document_folders')
    .update({ parent_id: parentId, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Collaboration & historique ────────────────────────────────

export type CollabRole = 'viewer' | 'editor';

export interface DocCollaborator {
  id: number;
  document_id: number;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  role: CollabRole;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocVersion {
  id: number;
  document_id: number;
  user_id: string | null;
  user_name: string | null;
  content: Record<string, unknown> | null;
  created_at: string;
}

export interface FoundUser {
  id: number;
  name: string;
  email: string;
  user_name: string;
}

export async function findUsers(query: string): Promise<FoundUser[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, user_name')
    .or(`email.ilike.%${q}%,user_name.ilike.%${q}%,name.ilike.%${q}%`)
    .limit(10);
  if (error) return [];
  return (data || []) as FoundUser[];
}

export async function fetchCollaborators(documentId: number): Promise<DocCollaborator[]> {
  const { data, error } = await supabase
    .from('document_collaborators')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as DocCollaborator[];
}

export async function addCollaborator(
  documentId: number,
  user: FoundUser,
  role: CollabRole,
  invitedBy: number,
): Promise<DocCollaborator> {
  const { data, error } = await supabase
    .from('document_collaborators')
    .upsert(
      {
        document_id: documentId,
        user_id: String(user.id),
        user_name: user.name || user.user_name,
        user_email: user.email,
        role,
        invited_by: String(invitedBy),
      },
      { onConflict: 'document_id,user_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as DocCollaborator;
}

export async function removeCollaborator(collabId: number): Promise<void> {
  const { error } = await supabase.from('document_collaborators').delete().eq('id', collabId);
  if (error) throw error;
}

export async function updateCollaboratorRole(collabId: number, role: CollabRole): Promise<void> {
  const { error } = await supabase
    .from('document_collaborators')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', collabId);
  if (error) throw error;
}

export async function fetchVersions(documentId: number): Promise<DocVersion[]> {
  const { data, error } = await supabase
    .from('document_versions')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []) as DocVersion[];
}

export async function getDocumentRole(
  documentId: number,
  userId: number,
  ownerUserId: string,
): Promise<CollabRole | 'owner'> {
  if (String(userId) === ownerUserId) return 'owner';
  const { data } = await supabase
    .from('document_collaborators')
    .select('role')
    .eq('document_id', documentId)
    .eq('user_id', String(userId))
    .maybeSingle();
  return (data?.role as CollabRole) || 'viewer';
}