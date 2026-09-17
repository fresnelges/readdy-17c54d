import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { adminRecharge } from '@/lib/wallet';
import { downloadCSV } from '@/lib/csv';
import {
  listTiers,
  listSubscriptions,
  listAllStoragePayments,
  upsertTier,
  deleteTier,
  formatPrix,
  type StorageTier,
  type StorageSubscription,
  type StoragePayment,
} from '@/lib/storageSubscription';

interface TierForm {
  nom: string;
  taille_mo: number;
  prix: number;
  monaie: string;
  sort_order: number;
  actif: boolean;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  active: { label: 'Actif', className: 'bg-accent-100 text-accent-700' },
  cancelled: { label: 'Résilié', className: 'bg-background-100 text-foreground-500' },
  expired: { label: 'Expiré', className: 'bg-red-100 text-red-700' },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const PAYMENT_TYPE_META: Record<string, { label: string; className: string }> = {
  souscription: { label: 'Souscription', className: 'bg-primary-100 text-primary-700' },
  changement: { label: 'Changement', className: 'bg-accent-100 text-accent-700' },
  renouvellement: { label: 'Renouvellement', className: 'bg-secondary-100 text-secondary-700' },
};

function paymentTypeMeta(t: string) {
  return PAYMENT_TYPE_META[t] || { label: t, className: 'bg-background-100 text-foreground-600' };
}

export default function SuperAdminStoragePage() {
  const [tiers, setTiers] = useState<StorageTier[]>([]);
  const [subs, setSubs] = useState<StorageSubscription[]>([]);
  const [payments, setPayments] = useState<StoragePayment[]>([]);
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StorageTier | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TierForm>({
    nom: '', taille_mo: 50, prix: 49, monaie: 'MAD', sort_order: 0, actif: true,
  });

  // Recharge manuelle
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: number; name: string; email: string; solde: number }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string; email: string; solde: number } | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeNote, setRechargeNote] = useState('');
  const [recharging, setRecharging] = useState(false);
  const [rechargeMsg, setRechargeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [t, s, p] = await Promise.all([listTiers(true), listSubscriptions(100), listAllStoragePayments(500)]);
      setTiers(t);
      setSubs(s);
      setPayments(p);
      const ids = Array.from(new Set([...s.map((x) => x.user_id), ...p.map((x) => x.user_id)]));
      if (ids.length > 0) {
        const { data: users } = await supabase.from('users').select('id,name').in('id', ids);
        const map: Record<number, string> = {};
        (users || []).forEach((u) => { map[u.id] = u.name; });
        setUserNames(map);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ nom: '', taille_mo: 50, prix: 49, monaie: 'MAD', sort_order: tiers.length + 1, actif: true });
    setFormOpen(true);
  };

  const openEdit = (tier: StorageTier) => {
    setEditing(tier);
    setForm({
      nom: tier.nom, taille_mo: tier.taille_mo, prix: Number(tier.prix),
      monaie: tier.monaie, sort_order: tier.sort_order, actif: tier.actif,
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.nom.trim() || form.taille_mo <= 0 || form.prix < 0) {
      setError('Renseignez un nom, une taille et un prix valides.');
      return;
    }
    setSaving(true);
    setError('');
    const res = await upsertTier({
      id: editing?.id,
      nom: form.nom.trim(),
      taille_mo: Number(form.taille_mo),
      prix: Number(form.prix),
      monaie: form.monaie || 'MAD',
      sort_order: Number(form.sort_order) || 0,
      actif: form.actif,
    });
    setSaving(false);
    if (!res.success) { setError(res.error || 'Erreur lors de l\u2019enregistrement'); return; }
    setFormOpen(false);
    await load();
  };

  const remove = async (tier: StorageTier) => {
    if (!window.confirm(`Supprimer le palier « ${tier.nom} » ?`)) return;
    const res = await deleteTier(tier.id);
    if (!res.success) { setError(res.error || 'Erreur lors de la suppression'); return; }
    await load();
  };

  const toggle = async (tier: StorageTier) => {
    const res = await upsertTier({ ...tier, actif: !tier.actif });
    if (!res.success) { setError(res.error || 'Erreur'); return; }
    await load();
  };

  const searchUsers = async (q: string) => {
    setSearchQuery(q);
    const term = q.trim();
    if (term.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('users')
      .select('id,name,email,solde')
      .or(`email.ilike.%${term}%,name.ilike.%${term}%`)
      .limit(8);
    setSearchResults((data || []) as { id: number; name: string; email: string; solde: number }[]);
  };

  const doRecharge = async () => {
    if (!selectedUser) return;
    const amount = Number(rechargeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setRechargeMsg({ type: 'error', text: 'Montant invalide.' });
      return;
    }
    setRecharging(true);
    setRechargeMsg(null);
    const res = await adminRecharge(selectedUser.id, amount, rechargeNote || undefined);
    setRecharging(false);
    if (!res.success) {
      setRechargeMsg({ type: 'error', text: res.error || 'Erreur lors de la recharge.' });
      return;
    }
    setRechargeMsg({ type: 'success', text: `${selectedUser.name} crédité de ${amount.toLocaleString('fr-FR')}.` });
    setRechargeAmount('');
    setRechargeNote('');
    setSelectedUser(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleExport = () => {
    const headers = ['Compte', 'ID utilisateur', 'Type', 'Palier', 'Taille (Mo)', 'Montant', 'Devise', 'Méthode', 'Date'];
    const rows = payments.map((p) => [
      userNames[p.user_id] || `#${p.user_id}`,
      String(p.user_id),
      paymentTypeMeta(p.type).label,
      p.tier_nom,
      p.taille_mo ? String(p.taille_mo) : '',
      String(Number(p.montant)),
      p.monaie,
      p.methode === 'wallet' ? 'Portefeuille' : p.methode,
      new Date(p.created_at).toLocaleString('fr-FR'),
    ]);
    downloadCSV('paiements-stockage-superadmin.csv', headers, rows);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Paliers de stockage</h2>
          <p className="text-sm text-foreground-500 mt-1">
            Définissez les offres de stockage supplémentaires (abonnement mensuel, payé via le portefeuille).
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 transition-colors"
        >
          <i className="ri-add-line"></i>
          Nouveau palier
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Tiers */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        </div>
      ) : tiers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mb-3">
            <i className="ri-database-2-line text-2xl text-foreground-400"></i>
          </div>
          <p className="text-foreground-600">Aucun palier défini. Créez votre première offre.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`bg-background-50 border rounded-lg p-5 ${tier.actif ? 'border-background-200/70' : 'border-background-200/40 opacity-70'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground-900">{tier.nom}</h3>
                  <p className="text-xs text-foreground-500 mt-0.5">+{tier.taille_mo} Mo de stockage</p>
                </div>
                <button
                  onClick={() => toggle(tier)}
                  className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${tier.actif ? 'bg-primary-500' : 'bg-background-200'}`}
                  title={tier.actif ? 'Désactiver' : 'Activer'}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background-50 transition-all ${tier.actif ? 'left-5' : 'left-0.5'}`}></span>
                </button>
              </div>

              <div className="text-2xl font-bold font-heading text-foreground-950 mb-1">
                {formatPrix(Number(tier.prix))} <span className="text-sm font-medium text-foreground-500">{tier.monaie}</span>
              </div>
              <p className="text-xs text-foreground-400 mb-4">/ mois · renouvellement automatique</p>

              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(tier)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-background-100 text-foreground-600 hover:bg-background-200/70 transition-colors"
                >
                  <i className="ri-pencil-line"></i>
                  Modifier
                </button>
                <button
                  onClick={() => remove(tier)}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Supprimer"
                >
                  <i className="ri-delete-bin-line"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recharge manuelle */}
      <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 mb-8">
        <h3 className="text-sm font-semibold text-foreground-700 mb-4 flex items-center gap-2">
          <i className="ri-wallet-3-line text-accent-500"></i>
          Recharge manuelle de portefeuille
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2 relative">
            <label className="block text-xs font-medium text-foreground-500 mb-1.5">Rechercher un utilisateur (email ou nom)</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => searchUsers(e.target.value)}
              placeholder="ex. contact@exemple.com"
              className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
            />
            {searchResults.length > 0 && !selectedUser && (
              <div className="absolute z-20 mt-1 w-full bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedUser(u); setSearchResults([]); setSearchQuery(`${u.name} (${u.email})`); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-background-100 transition-colors cursor-pointer"
                  >
                    <span className="text-foreground-800 truncate">{u.name}</span>
                    <span className="text-xs text-foreground-400 truncate ml-2">{u.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground-500 mb-1.5">Montant</label>
            <input
              type="number"
              min={1}
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              placeholder="100"
              className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
            />
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-foreground-500 mb-1.5">Note (optionnel)</label>
              <input
                type="text"
                value={rechargeNote}
                onChange={(e) => setRechargeNote(e.target.value)}
                placeholder="Recharge manuelle"
                className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
              />
            </div>
            <button
              onClick={doRecharge}
              disabled={recharging || !selectedUser}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-primary-500 text-background-50 hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {recharging ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-add-line"></i>}
              Créditer
            </button>
          </div>
        </div>

        {selectedUser && (
          <p className="text-xs text-foreground-500 mt-3">
            Compte sélectionné : <span className="font-medium text-foreground-700">{selectedUser.name}</span>
            {' · '}solde actuel {(selectedUser.solde || 0).toLocaleString('fr-FR')}
          </p>
        )}

        {rechargeMsg && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${rechargeMsg.type === 'success' ? 'bg-accent-50 border border-accent-200 text-accent-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {rechargeMsg.text}
          </div>
        )}
      </div>

      {/* Subscriptions */}
      <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-foreground-700 mb-4 flex items-center gap-2">
          <i className="ri-list-check-3 text-accent-500"></i>
          Abonnements actifs &amp; récents
        </h3>
        {subs.length === 0 ? (
          <p className="text-sm text-foreground-400 py-6 text-center">Aucun abonnement pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-foreground-400 border-b border-background-200/70">
                  <th className="py-2 pr-4 font-medium">Compte</th>
                  <th className="py-2 pr-4 font-medium">Stockage</th>
                  <th className="py-2 pr-4 font-medium">Prix / mois</th>
                  <th className="py-2 pr-4 font-medium">Prochain débit</th>
                  <th className="py-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => {
                  const meta = STATUS_META[s.status] || { label: s.status, className: 'bg-background-100 text-foreground-500' };
                  return (
                    <tr key={s.id} className="border-b border-background-200/50 last:border-0">
                      <td className="py-2.5 pr-4 text-foreground-800">{userNames[s.user_id] || `#${s.user_id}`}</td>
                      <td className="py-2.5 pr-4 text-foreground-600">+{s.taille_mo} Mo</td>
                      <td className="py-2.5 pr-4 text-foreground-600 whitespace-nowrap">
                        {formatPrix(Number(s.prix))} {s.monaie}
                      </td>
                      <td className="py-2.5 pr-4 text-foreground-500 whitespace-nowrap">{formatDate(s.next_billing_date)}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.className}`}>{meta.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historique des paiements */}
      <div className="mt-8 bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-background-200/70">
          <i className="ri-receipt-line text-accent-500"></i>
          <h3 className="text-sm font-semibold text-foreground-900">Historique des paiements de stockage</h3>
          <span className="text-xs text-foreground-400">({payments.length})</span>
          {payments.length > 0 && (
            <button
              onClick={handleExport}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer bg-secondary-100 text-secondary-900 hover:bg-secondary-200/70 transition-colors"
            >
              <i className="ri-file-download-line"></i>
              Exporter (CSV)
            </button>
          )}
        </div>

        {payments.length === 0 ? (
          <p className="text-sm text-foreground-400 py-8 text-center">Aucun paiement de stockage enregistré pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-foreground-400 border-b border-background-200/70">
                  <th className="py-2 px-5 font-medium">Compte</th>
                  <th className="py-2 px-3 font-medium">Type</th>
                  <th className="py-2 px-3 font-medium">Palier</th>
                  <th className="py-2 px-3 font-medium">Montant</th>
                  <th className="py-2 px-3 font-medium">Méthode</th>
                  <th className="py-2 px-5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const meta = paymentTypeMeta(p.type);
                  return (
                    <tr key={p.id} className="border-b border-background-200/50 last:border-0">
                      <td className="py-2.5 px-5">
                        <div className="text-foreground-800 font-medium">{userNames[p.user_id] || `#${p.user_id}`}</div>
                        <div className="text-xs text-foreground-400">ID {p.user_id}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${meta.className}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-foreground-700 whitespace-nowrap">{p.tier_nom}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-foreground-950">
                          {formatPrix(Number(p.montant))} {p.monaie}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-background-100 text-foreground-600 capitalize">
                          <i className="ri-wallet-3-line text-[10px]"></i>
                          {p.methode === 'wallet' ? 'Portefeuille' : p.methode}
                        </span>
                      </td>
                      <td className="py-2.5 px-5 text-foreground-500 whitespace-nowrap">{formatDateTime(p.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setFormOpen(false)}>
          <div
            className="bg-background-50 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-background-200/70">
              <h3 className="text-base font-semibold text-foreground-950">
                {editing ? 'Modifier le palier' : 'Nouveau palier'}
              </h3>
              <button
                onClick={() => setFormOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-background-100 cursor-pointer"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-500 mb-1.5">Nom</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="+50 Mo"
                  className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-500 mb-1.5">Stockage (Mo)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.taille_mo}
                    onChange={(e) => setForm({ ...form, taille_mo: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-500 mb-1.5">Prix / mois</label>
                  <input
                    type="number"
                    min={0}
                    value={form.prix}
                    onChange={(e) => setForm({ ...form, prix: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-500 mb-1.5">Devise</label>
                  <input
                    type="text"
                    value={form.monaie}
                    onChange={(e) => setForm({ ...form, monaie: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-500 mb-1.5">Ordre</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.actif}
                  onChange={(e) => setForm({ ...form, actif: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-foreground-700">Actif (visible pour les utilisateurs)</span>
              </label>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-background-200/70">
              <button
                onClick={() => setFormOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-background-100 text-foreground-600 hover:bg-background-200/70 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-primary-500 text-background-50 hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {saving ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-check-line"></i>}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}