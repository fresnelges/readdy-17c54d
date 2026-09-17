import { supabase } from '@/lib/supabase';
import { listFiles, getUserMediaFolder } from '@/lib/seaweedfs';

// Quota de stockage par défaut pour chaque compte professionnel (en octets).
export const DEFAULT_STORAGE_LIMIT_BYTES = 100 * 1024 * 1024; // 100 Mo

// Répartition de l'usage du stockage par source de fichiers.
export interface StorageBreakdown {
  formation: number; // fichiers de formation (fichierscours)
  projets: number; // fichiers de projets GestionPro (projetfichier)
  portfolio: number; // images du portfolio (portfolio.taille)
  medias: number; // fichiers de la bibliothèque Médias (SeaweedFS, dossier utilisateur)
}

export interface AccountStorage {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  percentUsed: number;
  breakdown: StorageBreakdown;
}

// Fichiers rattachés aux formations du compte (stockés sur SeaweedFS,
// taille suivie dans fichierscours.taille).
async function sumFormationFiles(userId: number): Promise<number> {
  const { data: formations, error } = await supabase
    .from('formations')
    .select('id')
    .eq('id_formateur', userId);

  if (error || !formations || formations.length === 0) return 0;

  const ids = formations.map((f) => f.id);
  const { data: files } = await supabase.from('fichierscours').select('taille').in('cours_id', ids);
  return (files || []).reduce((sum, f) => sum + (Number(f.taille) || 0), 0);
}

// Fichiers des projets GestionPro (projetfichier.taille + id_user).
async function sumProjectFiles(userId: number): Promise<number> {
  const { data: files } = await supabase
    .from('projetfichier')
    .select('taille')
    .eq('id_user', userId);
  return (files || []).reduce((sum, f) => sum + (Number(f.taille) || 0), 0);
}

// Images du portfolio (portfolio.taille + owner).
async function sumPortfolioFiles(userId: number): Promise<number> {
  const { data: items } = await supabase
    .from('portfolio')
    .select('taille')
    .eq('owner', userId);
  return (items || []).reduce((sum, f) => sum + (Number(f.taille) || 0), 0);
}

// Fichiers de la bibliothèque Médias : tout ce qui est stocké dans le dossier
// personnel de l'utilisateur sur SeaweedFS (users/{userId}/...).
async function sumMediaFiles(userId: number): Promise<number> {
  try {
    const data = await listFiles(`${getUserMediaFolder(userId)}/`);
    return data.totalSize;
  } catch {
    return 0;
  }
}

// Répartition détaillée de l'usage par source.
export async function getAccountStorageBreakdown(userId: number): Promise<StorageBreakdown> {
  try {
    const [formation, projets, portfolio, medias] = await Promise.all([
      sumFormationFiles(userId),
      sumProjectFiles(userId),
      sumPortfolioFiles(userId),
      sumMediaFiles(userId),
    ]);
    return { formation, projets, portfolio, medias };
  } catch {
    return { formation: 0, projets: 0, portfolio: 0, medias: 0 };
  }
}

// Espace total utilisé par le compte (somme de toutes les sources de fichiers).
export async function getAccountStorageUsage(userId: number): Promise<number> {
  const { formation, projets, portfolio, medias } = await getAccountStorageBreakdown(userId);
  return formation + projets + portfolio + medias;
}

// Limite de stockage du compte : 100 Mo par défaut, augmentée par les
// abonnements de stockage actifs (somme des taille_mo souscrits).
export async function getAccountStorageLimit(userId: number): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('storage_subscriptions')
      .select('taille_mo')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error || !data || data.length === 0) return DEFAULT_STORAGE_LIMIT_BYTES;

    const extraMo = data.reduce((sum, s) => sum + (Number(s.taille_mo) || 0), 0);
    return DEFAULT_STORAGE_LIMIT_BYTES + extraMo * 1024 * 1024;
  } catch {
    return DEFAULT_STORAGE_LIMIT_BYTES;
  }
}

export async function getAccountStorage(userId: number): Promise<AccountStorage> {
  const [breakdown, limitBytes] = await Promise.all([
    getAccountStorageBreakdown(userId),
    getAccountStorageLimit(userId),
  ]);

  const usedBytes = breakdown.formation + breakdown.projets + breakdown.portfolio + breakdown.medias;
  const remainingBytes = Math.max(0, limitBytes - usedBytes);
  const percentUsed = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;

  return { usedBytes, limitBytes, remainingBytes, percentUsed, breakdown };
}