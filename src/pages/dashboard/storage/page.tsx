import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getAccountStorage, type AccountStorage } from '@/lib/storageQuota';
import { formatFileSize } from '@/lib/seaweedfs';
import { downloadCSV } from '@/lib/csv';
import {
  listTiers,
  getActiveSubscription,
  listStoragePayments,
  subscribe,
  cancelSubscription,
  processRenewals,
  formatPrix,
  type StorageTier,
  type StorageSubscription,
  type StoragePayment,
  type PaymentMethod,
} from '@/lib/storageSubscription';

function barColor(p: number): string {
  if (p >= 90) return 'bg-red-500';
  if (p >= 70) return 'bg-amber-500';
  return 'bg-primary-500';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const PAYMENT_TYPE_META: Record<string, { label: string; icon: string; className: string }> = {
  souscription: { label: 'Souscription', icon: 'ri-add-circle-line', className: 'bg-primary-100 text-primary-700' },
  changement: { label: 'Changement de palier', icon: 'ri-arrow-left-right-line', className: 'bg-accent-100 text-accent-700' },
  renouvellement: { label: 'Renouvellement', icon: 'ri-refresh-line', className: 'bg-secondary-100 text-secondary-700' },
};

function paymentTypeMeta(t: string) {
  return PAYMENT_TYPE_META[t] || { label: t, icon: 'ri-shopping-cart-2-line', className: 'bg-background-100 text-foreground-600' };
}

export default function DashboardStoragePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [tiers, setTiers] = useState<StorageTier[]>([]);
  const [storage, setStorage] = useState<AccountStorage | null>(null);
  const [activeSub, setActiveSub] = useState<StorageSubscription | null>(null);
  const [payments, setPayments] = useState<StoragePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [payTier, setPayTier] = useState<StorageTier | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('wallet');
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      await processRenewals(user.id);
      const [t, s, st, p] = await Promise.all([
        listTiers(),
        getActiveSubscription(user.id),
        getAccountStorage(user.id),
        listStoragePayments(user.id, 50),
      ]);
      setTiers(t);
      setActiveSub(s);
      setStorage(st);
      setPayments(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const openPay = (tier: StorageTier) => {
    setPayTier(tier);
    setPayMethod('wallet');
    setError('');
  };

  const confirmSubscribe = async () => {
    if (!user || !payTier) return;
    setPaying(true);
    setError('');
    setSuccess('');
    const res = await subscribe(user.id, payTier, payMethod, activeSub?.id);
    setPaying(false);
    if (!res.success) {
      setError(res.error || 'Erreur lors de la souscription');
      return;
    }
    if (typeof res.newSolde === 'number') updateUser({ solde: res.newSolde });
    setSuccess(`Abonnement ${activeSub ? 'modifié' : 'souscrit'} : ${payTier.nom} actif.`);
    setPayTier(null);
    await load();
  };

  const handleCancel = async () => {
    if (!activeSub) return;
    if (!window.confirm('Résilier votre abonnement de stockage ? Votre stockage reviendra à 100 Mo à la fin de la période.')) return;
    setBusy(-1);
    setError('');
    setSuccess('');
    const res = await cancelSubscription(activeSub.id);
    setBusy(null);
    if (!res.success) { setError(res.error || 'Erreur lors de la résiliation'); return; }
    setSuccess('Abonnement résilié.');
    await load();
  };

  const handleExport = () => {
    const headers = ['Type', 'Palier', 'Taille (Mo)', 'Montant', 'Devise', 'Méthode', 'Date'];
    const rows = payments.map((p) => [
      paymentTypeMeta(p.type).label,
      p.tier_nom,
      p.taille_mo ? String(p.taille_mo) : '',
      String(Number(p.montant)),
      p.monaie,
      p.methode === 'wallet' ? 'Portefeuille' : p.methode,
      new Date(p.created_at).toLocaleDateString('fr-FR'),
    ]);
    downloadCSV('historique-paiements-stockage.csv', headers, rows);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Stockage</h2>
        <p className="text-sm text-foreground-500 mt-1">
          Chaque compte pro inclut 100 Mo. Ajoutez du stockage avec un abonnement mensuel.
        </p>
      </div>

      {/* Wallet + usage summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <div className="flex items-center gap-2 text-foreground-500 text-sm mb-1">
            <i className="ri-wallet-3-line text-accent-500"></i>
            Portefeuille
          </div>
          <div className="text-2xl font-bold font-heading text-foreground-950">
            {(user?.solde || 0).toLocaleString('fr-FR')} <span className="text-sm font-medium text-foreground-500">{user?.monaie || 'MAD'}</span>
          </div>
        </div>

        <div className="lg:col-span-2 bg-background-50 border border-background-200/70 rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-foreground-500 text-sm">
              <i className="ri-database-2-line text-primary-500"></i>
              Stockage utilisé
            </div>
            {storage && (
              <span className="text-sm font-medium text-foreground-700">
                {formatFileSize(storage.usedBytes)} / {formatFileSize(storage.limitBytes)}
              </span>
            )}
          </div>
          {storage && (
            <>
              <div className="h-2.5 rounded-full bg-background-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor(storage.percentUsed)}`}
                  style={{ width: `${Math.max(2, storage.percentUsed)}%` }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                {[
                  { label: 'Formations', value: storage.breakdown.formation, icon: 'ri-graduation-cap-line', color: 'text-primary-500' },
                  { label: 'Projets', value: storage.breakdown.projets, icon: 'ri-folder-3-line', color: 'text-accent-500' },
                  { label: 'Portfolio', value: storage.breakdown.portfolio, icon: 'ri-briefcase-line', color: 'text-secondary-500' },
                  { label: 'Médias', value: storage.breakdown.medias, icon: 'ri-image-line', color: 'text-primary-500' },
                ].map((src) => (
                  <div key={src.label} className="flex items-center gap-3 p-3 bg-background-100/60 rounded-lg">
                    <span className={`w-9 h-9 rounded-lg bg-background-50 flex items-center justify-center ${src.color}`}>
                      <i className={`${src.icon} text-lg`}></i>
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-foreground-500">{src.label}</p>
                      <p className="text-sm font-semibold text-foreground-900">{formatFileSize(src.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-accent-50 border border-accent-200 rounded-lg text-sm text-accent-700">{success}</div>
      )}

      {/* Current subscription */}
      {activeSub && (
        <div className="mb-6 p-5 bg-accent-50 border border-accent-200 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground-900">Abonnement actif</p>
              <p className="text-sm text-foreground-600 mt-1">
                +{activeSub.taille_mo} Mo · {formatPrix(Number(activeSub.prix))} {activeSub.monaie}/mois
                {' · '}prochain débit le {formatDate(activeSub.next_billing_date)}
              </p>
            </div>
            <button
              onClick={handleCancel}
              disabled={busy === -1}
              className="px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-background-50 text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Résilier
            </button>
          </div>
        </div>
      )}

      {/* Tiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiers.map((tier) => {
          const isCurrent = activeSub?.tier_id === tier.id;
          return (
            <div key={tier.id} className="bg-background-50 border border-background-200/70 rounded-lg p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-foreground-900">{tier.nom}</h3>
                {isCurrent && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-700">Actuel</span>
                )}
              </div>
              <p className="text-xs text-foreground-500 mb-2">+{tier.taille_mo} Mo de stockage supplémentaire</p>
              <div className="text-2xl font-bold font-heading text-foreground-950 mb-1">
                {formatPrix(Number(tier.prix))} <span className="text-sm font-medium text-foreground-500">{tier.monaie}</span>
              </div>
              <p className="text-xs text-foreground-400 mb-4">/ mois · renouvellement automatique</p>

              <button
                onClick={() => openPay(tier)}
                disabled={busy !== null || isCurrent}
                className={`mt-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  isCurrent
                    ? 'bg-background-100 text-foreground-400 cursor-default'
                    : 'bg-primary-500 text-background-50 hover:bg-primary-600 disabled:opacity-50'
                }`}
              >
                {busy === tier.id ? (
                  <i className="ri-loader-4-line animate-spin"></i>
                ) : isCurrent ? (
                  <i className="ri-check-line"></i>
                ) : (
                  <i className="ri-shopping-cart-2-line"></i>
                )}
                {isCurrent ? 'Abonné' : activeSub ? 'Changer de palier' : 'Souscrire'}
              </button>
            </div>
          );
        })}
      </div>

      {tiers.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mb-3">
            <i className="ri-database-2-line text-2xl text-foreground-400"></i>
          </div>
          <p className="text-foreground-600">Aucune offre de stockage disponible pour le moment.</p>
        </div>
      )}

      {/* Historique des paiements */}
      <div className="mt-8 bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-background-200/70">
          <i className="ri-receipt-line text-accent-500"></i>
          <h3 className="text-sm font-semibold text-foreground-900">Historique des paiements de stockage</h3>
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
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mb-3">
              <i className="ri-receipt-line text-2xl text-foreground-400"></i>
            </div>
            <p className="text-sm text-foreground-500">Aucun paiement de stockage enregistré pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-foreground-400 border-b border-background-200/70">
                  <th className="py-2 px-5 font-medium">Type</th>
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
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.className}`}>
                          <i className={`${meta.icon} text-[10px]`}></i>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-foreground-700">
                        <span className="font-medium">{p.tier_nom}</span>
                        {p.taille_mo > 0 && p.type !== 'renouvellement' && (
                          <span className="text-xs text-foreground-400 ml-1">· +{p.taille_mo} Mo</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-foreground-950">
                          {formatPrix(Number(p.montant))} {p.monaie}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-background-100 text-foreground-600 capitalize">
                          <i className="ri-wallet-3-line text-[10px]"></i>
                          {p.methode === 'wallet' ? 'Portefeuille' : p.methode}
                        </span>
                      </td>
                      <td className="py-2.5 px-5 text-foreground-500 whitespace-nowrap">{formatDate(p.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={() => navigate('/dashboard/apps/formation')}
          className="text-sm text-primary-600 hover:text-primary-700 cursor-pointer"
        >
          <i className="ri-arrow-left-line mr-1"></i>
          Retour aux formations
        </button>
      </div>

      {/* Modal de paiement */}
      {payTier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => !paying && setPayTier(null)}
        >
          <div
            className="bg-background-50 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-background-200/70">
              <h3 className="text-base font-semibold text-foreground-950">Paiement de l&apos;abonnement</h3>
              <button
                onClick={() => !paying && setPayTier(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-background-100 cursor-pointer"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="p-5">
              <div className="mb-5 p-4 bg-background-100/60 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground-900">{payTier.nom}</span>
                  <span className="text-sm font-bold text-foreground-950">
                    {formatPrix(Number(payTier.prix))} {payTier.monaie}
                  </span>
                </div>
                <p className="text-xs text-foreground-500 mt-1">
                  +{payTier.taille_mo} Mo de stockage · renouvellement mensuel automatique
                </p>
              </div>

              <div className="space-y-3">
                {/* Solde portefeuille */}
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${payMethod === 'wallet' ? 'border-primary-300 bg-primary-50/40' : 'border-background-200/70 hover:bg-background-100'}`}>
                  <input
                    type="radio"
                    name="pay-method"
                    checked={payMethod === 'wallet'}
                    onChange={() => setPayMethod('wallet')}
                    className="mt-0.5 w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground-900">
                      <i className="ri-wallet-3-line text-primary-600"></i>
                      Solde du portefeuille
                    </div>
                    <p className="text-xs text-foreground-500 mt-0.5">
                      Disponible : {(user?.solde || 0).toLocaleString('fr-FR')} {user?.monaie || payTier.monaie}
                    </p>
                  </div>
                </label>

                {/* PayPal */}
                <div className="flex items-start gap-3 p-3 rounded-lg border border-background-200/70 opacity-60 cursor-not-allowed">
                  <input type="radio" name="pay-method" disabled className="mt-0.5 w-4 h-4" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground-500">
                      <i className="ri-paypal-line text-accent-500"></i>
                      PayPal
                    </div>
                    <p className="text-xs text-foreground-400 mt-0.5">Bientôt disponible (passerelle à connecter)</p>
                  </div>
                </div>

                {/* Stripe */}
                <div className="flex items-start gap-3 p-3 rounded-lg border border-background-200/70 opacity-60 cursor-not-allowed">
                  <input type="radio" name="pay-method" disabled className="mt-0.5 w-4 h-4" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground-500">
                      <i className="ri-bank-card-line text-accent-500"></i>
                      Stripe (carte bancaire)
                    </div>
                    <p className="text-xs text-foreground-400 mt-0.5">Bientôt disponible (passerelle à connecter)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-background-200/70">
              <button
                onClick={() => setPayTier(null)}
                disabled={paying}
                className="flex-1 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-background-100 text-foreground-600 hover:bg-background-200/70 disabled:opacity-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmSubscribe}
                disabled={paying}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-primary-500 text-background-50 hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {paying ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-check-line"></i>}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}