import { supabase } from '@/lib/supabase';
import { debitWallet, creditWallet } from '@/lib/wallet';

// ─────────────────────────────────────────────────────────────
// Palier de stockage (défini par le superadmin) + abonnement.
// Paiement par portefeuille (users.solde) ou passerelle externe
// (PayPal / Stripe, branchés après connexion). Renouvellement mensuel.
// ─────────────────────────────────────────────────────────────

export type PaymentMethod = 'wallet' | 'paypal' | 'stripe';

export interface StorageTier {
  id: number;
  nom: string;
  taille_mo: number;
  prix: number;
  monaie: string;
  actif: boolean;
  sort_order: number;
}

export interface StorageSubscription {
  id: number;
  user_id: number;
  tier_id: number;
  taille_mo: number;
  prix: number;
  monaie: string;
  start_date: string;
  next_billing_date: string;
  status: string;
}

export type StoragePaymentType = 'souscription' | 'changement' | 'renouvellement';

export interface StoragePayment {
  id: number;
  user_id: number;
  tier_id: number | null;
  tier_nom: string;
  taille_mo: number;
  montant: number;
  monaie: string;
  methode: string;
  type: StoragePaymentType;
  statut: string;
  created_at: string;
}

export interface SubscribeResult {
  success: boolean;
  error?: string;
  newSolde?: number;
}

export function formatPrix(prix: number): string {
  const n = Number(prix);
  return Number.isInteger(n) ? n.toLocaleString('fr-FR') : n.toFixed(2).replace('.', ',');
}

export async function listTiers(includeInactive = false): Promise<StorageTier[]> {
  let query = supabase.from('storage_tiers').select('*').order('sort_order', { ascending: true });
  if (!includeInactive) query = query.eq('actif', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as StorageTier[];
}

export async function listSubscriptions(limit = 100): Promise<StorageSubscription[]> {
  const { data, error } = await supabase
    .from('storage_subscriptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as StorageSubscription[];
}

export async function getActiveSubscription(userId: number): Promise<StorageSubscription | null> {
  const { data, error } = await supabase
    .from('storage_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data || null) as StorageSubscription | null;
}

// Historique des paiements de stockage (souscriptions, changements, renouvellements).
export async function listStoragePayments(userId: number, limit = 100): Promise<StoragePayment[]> {
  const { data, error } = await supabase
    .from('storage_payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as StoragePayment[];
}

// Tous les paiements de stockage (vue superadmin), sans filtre utilisateur.
export async function listAllStoragePayments(limit = 500): Promise<StoragePayment[]> {
  const { data, error } = await supabase
    .from('storage_payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as StoragePayment[];
}

async function recordStoragePayment(entry: {
  user_id: number;
  tier_id: number;
  tier_nom: string;
  taille_mo: number;
  montant: number;
  monaie: string;
  methode: string;
  type: StoragePaymentType;
}): Promise<void> {
  const { error } = await supabase.from('storage_payments').insert({
    user_id: entry.user_id,
    tier_id: entry.tier_id,
    tier_nom: entry.tier_nom,
    taille_mo: entry.taille_mo,
    montant: entry.montant,
    monaie: entry.monaie,
    methode: entry.methode,
    type: entry.type,
    statut: 'complete',
  });
  if (error) throw error;
}

export async function upsertTier(tier: Partial<StorageTier>): Promise<{ success: boolean; error?: string }> {
  const payload = {
    nom: tier.nom,
    taille_mo: tier.taille_mo,
    prix: tier.prix,
    monaie: tier.monaie || 'MAD',
    actif: tier.actif ?? true,
    sort_order: tier.sort_order ?? 0,
  };
  let result;
  if (tier.id) {
    result = await supabase
      .from('storage_tiers')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', tier.id);
  } else {
    result = await supabase.from('storage_tiers').insert(payload);
  }
  if (result.error) return { success: false, error: result.error.message };
  return { success: true };
}

export async function deleteTier(id: number): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('storage_tiers').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

function nextMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

async function upsertSubscription(
  userId: number,
  tier: StorageTier,
  existingSubId?: number,
): Promise<{ success: boolean; error?: string }> {
  const payload = {
    user_id: userId,
    tier_id: tier.id,
    taille_mo: tier.taille_mo,
    prix: tier.prix,
    monaie: tier.monaie,
    next_billing_date: nextMonth(),
    status: 'active',
  };

  if (existingSubId) {
    const { error } = await supabase
      .from('storage_subscriptions')
      .update(payload)
      .eq('id', existingSubId);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase
      .from('storage_subscriptions')
      .insert({ ...payload, start_date: new Date().toISOString() });
    if (error) return { success: false, error: error.message };
  }
  return { success: true };
}

// Souscrire (ou changer de palier) à un abonnement de stockage.
// - method = 'wallet' : débite le portefeuille puis active l'abonnement.
// - method = 'paypal' | 'stripe' : paiement externe (à brancher après connexion).
export async function subscribe(
  userId: number,
  tier: StorageTier,
  method: PaymentMethod,
  existingSubId?: number,
): Promise<SubscribeResult> {
  const amount = Math.round(Number(tier.prix));

  if (method === 'wallet') {
    const debit = await debitWallet(userId, amount, 'wallet', `Abonnement stockage : ${tier.nom}`);
    if (!debit.success) return { success: false, error: debit.error };

    const sub = await upsertSubscription(userId, tier, existingSubId);
    if (!sub.success) {
      // Rollback : on re-crédite le portefeuille si l'abonnement n'a pas pu être enregistré.
      await creditWallet(userId, amount, 'wallet', `Annulation abonnement : ${tier.nom}`);
      return { success: false, error: sub.error };
    }

    await recordStoragePayment({
      user_id: userId,
      tier_id: tier.id,
      tier_nom: tier.nom,
      taille_mo: tier.taille_mo,
      montant: amount,
      monaie: tier.monaie,
      methode: 'wallet',
      type: existingSubId ? 'changement' : 'souscription',
    });

    return { success: true, newSolde: debit.newSolde };
  }

  // PayPal / Stripe : la passerelle n'est pas encore branchée.
  return {
    success: false,
    error:
      method === 'paypal'
        ? 'Le paiement PayPal n\u2019est pas encore connecté. Rechargez votre portefeuille ou contactez le support.'
        : 'Le paiement Stripe n\u2019est pas encore connecté. Rechargez votre portefeuille ou contactez le support.',
  };
}

export async function cancelSubscription(subId: number): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('storage_subscriptions')
    .update({ status: 'cancelled' })
    .eq('id', subId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Renouvellement « paresseux » : traite les abonnements actifs arrivés à échéance.
export async function processRenewals(userId: number): Promise<void> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('storage_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .lte('next_billing_date', now);
  if (error || !data) return;

  for (const sub of data as StorageSubscription[]) {
    const amount = Math.round(Number(sub.prix));
    const debit = await debitWallet(userId, amount, 'wallet', `Renouvellement stockage : +${sub.taille_mo} Mo`);

    if (!debit.success) {
      await supabase.from('storage_subscriptions').update({ status: 'expired' }).eq('id', sub.id);
      continue;
    }

    await supabase
      .from('storage_subscriptions')
      .update({ next_billing_date: nextMonth() })
      .eq('id', sub.id);

    await recordStoragePayment({
      user_id: userId,
      tier_id: sub.tier_id,
      tier_nom: `+${sub.taille_mo} Mo`,
      taille_mo: sub.taille_mo,
      montant: amount,
      monaie: sub.monaie,
      methode: 'wallet',
      type: 'renouvellement',
    });
  }
}