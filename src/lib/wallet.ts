import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────
// Portefeuille utilisateur (wallet).
// Le solde réel est stocké sur users.solde (entier) + users.monaie (devise).
// Chaque opération (recharge, débit, remboursement) est journalisée dans
// la table wallet_transactions pour un historique propre et complet.
// ─────────────────────────────────────────────────────────────

export type WalletTxType = 'recharge' | 'debit' | 'refund';

export interface WalletTransaction {
  id: number;
  user_id: number;
  type: WalletTxType;
  montant: number;
  methode: string;
  statut: string;
  reference: string | null;
  note: string | null;
  created_at: string;
}

export interface WalletResult {
  success: boolean;
  error?: string;
  newSolde?: number;
}

// Solde actuel du compte.
export async function getBalance(userId: number): Promise<number> {
  try {
    const { data } = await supabase.from('users').select('solde').eq('id', userId).maybeSingle();
    return Number(data?.solde || 0);
  } catch {
    return 0;
  }
}

// Historique des opérations du portefeuille.
export async function listWalletTransactions(userId: number, limit = 100): Promise<WalletTransaction[]> {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as WalletTransaction[];
}

async function recordTransaction(entry: {
  user_id: number;
  type: WalletTxType;
  montant: number;
  methode: string;
  statut?: string;
  reference?: string | null;
  note?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('wallet_transactions').insert({
    user_id: entry.user_id,
    type: entry.type,
    montant: entry.montant,
    methode: entry.methode,
    statut: entry.statut || 'complete',
    reference: entry.reference || null,
    note: entry.note || null,
  });
  if (error) throw error;
}

// Applique une variation de solde (+amount pour créditer, -amount pour débiter).
// Retourne le nouveau solde. Lève une erreur si le solde devient négatif.
async function applyBalanceChange(userId: number, amount: number): Promise<number> {
  const balance = await getBalance(userId);
  const newSolde = balance + amount;
  if (newSolde < 0) throw new Error('SOLDE_INSUFFISANT');
  const { error } = await supabase.from('users').update({ solde: newSolde }).eq('id', userId);
  if (error) throw error;
  return newSolde;
}

// Crédite le portefeuille (recharge) : PayPal, Stripe, admin, etc.
export async function creditWallet(
  userId: number,
  amount: number,
  methode: string,
  note?: string,
  reference?: string,
): Promise<WalletResult> {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return { success: false, error: 'Montant invalide.' };
  try {
    const newSolde = await applyBalanceChange(userId, amt);
    await recordTransaction({ user_id: userId, type: 'recharge', montant: amt, methode, note, reference });
    return { success: true, newSolde };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur lors de la recharge.' };
  }
}

// Débite le portefeuille (paiement d'un service, abonnement, etc.).
export async function debitWallet(
  userId: number,
  amount: number,
  methode: string,
  note?: string,
  reference?: string,
): Promise<WalletResult> {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return { success: false, error: 'Montant invalide.' };
  try {
    const newSolde = await applyBalanceChange(userId, -amt);
    await recordTransaction({ user_id: userId, type: 'debit', montant: amt, methode, note, reference });
    return { success: true, newSolde };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'SOLDE_INSUFFISANT') {
      return { success: false, error: 'Solde insuffisant. Rechargez votre portefeuille pour continuer.' };
    }
    return { success: false, error: e instanceof Error ? e.message : 'Erreur lors du débit.' };
  }
}

// Recharge manuelle effectuée par le superadmin.
export async function adminRecharge(userId: number, amount: number, note?: string): Promise<WalletResult> {
  return creditWallet(userId, amount, 'admin', note || 'Recharge manuelle par l\u2019administrateur');
}