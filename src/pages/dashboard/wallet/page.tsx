import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getBalance,
  listWalletTransactions,
  type WalletTransaction,
} from '@/lib/wallet';

const METHOD_META: Record<string, { label: string; icon: string; className: string }> = {
  wallet: { label: 'Portefeuille', icon: 'ri-wallet-3-line', className: 'bg-primary-100 text-primary-700' },
  admin: { label: 'Administrateur', icon: 'ri-shield-star-line', className: 'bg-secondary-100 text-secondary-700' },
  paypal: { label: 'PayPal', icon: 'ri-paypal-line', className: 'bg-accent-100 text-accent-700' },
  stripe: { label: 'Stripe', icon: 'ri-bank-card-line', className: 'bg-accent-100 text-accent-700' },
};

function methodMeta(m: string) {
  return METHOD_META[m] || { label: m, icon: 'ri-bank-card-line', className: 'bg-background-100 text-foreground-600' };
}

function formatMontant(n: number, monaie: string): string {
  return `${Number(n).toLocaleString('fr-FR')} ${monaie}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardWalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(user?.solde || 0);
  const [txs, setTxs] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const monaie = user?.monaie || 'MAD';

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [b, t] = await Promise.all([getBalance(user.id), listWalletTransactions(user.id, 100)]);
      setBalance(b);
      setTxs(t);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Portefeuille</h2>
        <p className="text-sm text-foreground-500 mt-1">
          Votre solde, vos recharges et l&apos;historique de vos opérations.
        </p>
      </div>

      {/* Solde + recharge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5">
          <div className="flex items-center gap-2 text-foreground-500 text-sm mb-2">
            <i className="ri-wallet-3-line text-accent-500"></i>
            Solde disponible
          </div>
          <div className="text-3xl font-bold font-heading text-foreground-950">
            {balance.toLocaleString('fr-FR')}{' '}
            <span className="text-base font-medium text-foreground-500">{monaie}</span>
          </div>
          <p className="text-xs text-foreground-400 mt-3">
            Utilisez ce solde pour payer vos abonnements de stockage et services.
          </p>
        </div>

        <div className="lg:col-span-2 bg-background-50 border border-background-200/70 rounded-lg p-5">
          <div className="flex items-center gap-2 text-foreground-500 text-sm mb-3">
            <i className="ri-add-circle-line text-primary-500"></i>
            Recharger le portefeuille
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              disabled
              title="Connectez PayPal depuis les intégrations pour activer la recharge"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap cursor-not-allowed bg-background-100 text-foreground-400 border border-background-200/70 opacity-70"
            >
              <i className="ri-paypal-line text-lg"></i>
              Recharger via PayPal
            </button>
            <button
              disabled
              title="Connectez Stripe depuis les intégrations pour activer la recharge"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap cursor-not-allowed bg-background-100 text-foreground-400 border border-background-200/70 opacity-70"
            >
              <i className="ri-bank-card-line text-lg"></i>
              Recharger via Stripe
            </button>
          </div>
          <p className="text-xs text-foreground-400 mt-3">
            Le paiement en ligne (PayPal / Stripe) sera activé dès que vous aurez connecté ces
            passerelles. En attendant, un administrateur peut créditer votre portefeuille manuellement.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Historique */}
      <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-background-200/70">
          <i className="ri-history-line text-accent-500"></i>
          <h3 className="text-sm font-semibold text-foreground-900">Historique des opérations</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
          </div>
        ) : txs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mb-3">
              <i className="ri-wallet-3-line text-2xl text-foreground-400"></i>
            </div>
            <p className="text-sm text-foreground-500">Aucune opération pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-foreground-400 border-b border-background-200/70">
                  <th className="py-2 px-5 font-medium">Type</th>
                  <th className="py-2 px-3 font-medium">Montant</th>
                  <th className="py-2 px-3 font-medium">Méthode</th>
                  <th className="py-2 px-3 font-medium">Détails</th>
                  <th className="py-2 px-5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx) => {
                  const meta = methodMeta(tx.methode);
                  const isCredit = tx.type === 'recharge';
                  return (
                    <tr key={tx.id} className="border-b border-background-200/50 last:border-0">
                      <td className="py-2.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            isCredit ? 'bg-accent-100 text-accent-700' : 'bg-primary-100 text-primary-700'
                          }`}
                        >
                          <i className={`${isCredit ? 'ri-arrow-down-line' : 'ri-arrow-up-line'} text-[10px]`}></i>
                          {isCredit ? 'Recharge' : tx.type === 'refund' ? 'Remboursement' : 'Débit'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`text-sm font-bold ${isCredit ? 'text-accent-600' : 'text-primary-600'}`}>
                          {isCredit ? '+' : '-'}{Number(tx.montant).toLocaleString('fr-FR')} {monaie}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.className}`}>
                          <i className={`${meta.icon} text-[10px]`}></i>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-foreground-600 max-w-[240px] truncate" title={tx.note || ''}>
                        {tx.note || '—'}
                      </td>
                      <td className="py-2.5 px-5 text-foreground-500 whitespace-nowrap">{formatDate(tx.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}