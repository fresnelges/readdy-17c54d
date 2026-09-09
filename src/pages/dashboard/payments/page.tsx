import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Transaction {
  id: number;
  id_sender: number;
  id_receiver: number;
  montant: string;
  date: string;
  note: string | null;
  montant_commande: string | null;
  pourcentage: string | null;
  id_commande: string | null;
  provenance: string | null;
  asc_field: string | null;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .or(`id_receiver.eq.${user!.id},id_sender.eq.${user!.id}`)
        .order('date', { ascending: false })
        .limit(100);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      let filtered = data || [];
      if (typeFilter === 'received') {
        filtered = filtered.filter((t) => t.id_receiver === user!.id);
      } else if (typeFilter === 'sent') {
        filtered = filtered.filter((t) => t.id_sender === user!.id);
      }
      setTransactions(filtered);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, user]);

  useEffect(() => {
    if (user) fetchTransactions();
  }, [fetchTransactions, user]);

  const totalReceived = transactions
    .filter((t) => t.id_receiver === user?.id)
    .reduce((sum, t) => sum + (parseFloat(t.montant) || 0), 0);

  const totalSent = transactions
    .filter((t) => t.id_sender === user?.id)
    .reduce((sum, t) => sum + (parseFloat(t.montant) || 0), 0);

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Paiements</h2>
          <p className="text-sm text-foreground-500 mt-1">Historique des transactions et revenus</p>
        </div>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4 md:p-5">
          <div className="w-9 h-9 rounded-lg bg-accent-100 text-accent-700 flex items-center justify-center mb-3">
            <i className="ri-arrow-down-circle-line text-lg"></i>
          </div>
          <div className="text-xs text-foreground-500 mb-1">Reçus</div>
          <div className="text-xl md:text-2xl font-bold font-heading text-accent-600">
            {totalReceived.toLocaleString()} {user?.monaie}
          </div>
        </div>
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4 md:p-5">
          <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center mb-3">
            <i className="ri-arrow-up-circle-line text-lg"></i>
          </div>
          <div className="text-xs text-foreground-500 mb-1">Envoyés</div>
          <div className="text-xl md:text-2xl font-bold font-heading text-primary-600">
            {totalSent.toLocaleString()} {user?.monaie}
          </div>
        </div>
        <div className="col-span-2 lg:col-span-1 bg-background-50 border border-background-200/70 rounded-lg p-4 md:p-5">
          <div className="w-9 h-9 rounded-lg bg-secondary-100 text-secondary-700 flex items-center justify-center mb-3">
            <i className="ri-wallet-3-line text-lg"></i>
          </div>
          <div className="text-xs text-foreground-500 mb-1">Solde actuel</div>
          <div className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            {user?.solde?.toLocaleString() || '0'} {user?.monaie}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { value: 'all', label: 'Toutes' },
          { value: 'received', label: 'Reçues' },
          { value: 'sent', label: 'Envoyées' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              typeFilter === f.value
                ? 'bg-primary-50 text-primary-700 border border-primary-200'
                : 'bg-background-50 border border-background-200/70 text-foreground-600 hover:bg-background-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <i className="ri-error-warning-line text-4xl text-red-400 mb-3"></i>
          <p className="text-foreground-600 mb-3">{error}</p>
          <button onClick={fetchTransactions} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors">
            Réessayer
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
            <i className="ri-bank-card-line text-2xl text-foreground-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-foreground-800 mb-1">Aucune transaction</h3>
          <p className="text-sm text-foreground-500">Les transactions apparaîtront ici</p>
        </div>
      ) : (
        <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-background-200/70 bg-background-100 text-xs font-semibold text-foreground-500 uppercase tracking-wider">
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Montant</div>
            <div className="col-span-3">Détails</div>
            <div className="col-span-3">Provenance</div>
            <div className="col-span-2">Date</div>
          </div>
          <div className="divide-y divide-background-200/70">
            {transactions.map((tx) => {
              const isReceived = tx.id_receiver === user?.id;
              return (
                <div key={tx.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 items-center hover:bg-background-50/50 transition-colors">
                  <div className="md:col-span-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        isReceived ? 'bg-accent-100 text-accent-700' : 'bg-primary-100 text-primary-700'
                      }`}
                    >
                      <i className={`${isReceived ? 'ri-arrow-down-line' : 'ri-arrow-up-line'} text-[10px]`}></i>
                      {isReceived ? 'Reçu' : 'Envoyé'}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <span className={`text-sm font-bold ${isReceived ? 'text-accent-600' : 'text-primary-600'}`}>
                      {isReceived ? '+' : '-'}{parseFloat(tx.montant).toLocaleString()} {user?.monaie}
                    </span>
                  </div>
                  <div className="md:col-span-3">
                    <span className="text-sm text-foreground-600">
                      {tx.note || (tx.montant_commande ? `Commande: ${tx.montant_commande}` : 'Transaction')}
                    </span>
                  </div>
                  <div className="md:col-span-3">
                    <span className="text-xs text-foreground-500">
                      {tx.provenance || (tx.id_commande ? `Commande #${tx.id_commande}` : '—')}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-xs text-foreground-400">
                      {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-foreground-500">
          <span>{transactions.length} transaction{transactions.length > 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}