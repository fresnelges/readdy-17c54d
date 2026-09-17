import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Commande {
  id: number;
  titre: string;
  nomclient: string;
  email: string;
  tel: string;
  adresse: string;
  details: string;
  detailssup: string;
  totalht: string;
  totalttc: string;
  sommepayee: string;
  monaie: string;
  methodepayment: string;
  date_time: string;
  statut_com_vendeur: string;
  quantite: number;
  notevendeur: string;
}

interface Transaction {
  id: number;
  montant: number;
  methode: string;
  statut: string;
  date_time: string;
}

interface SiteVisit {
  id: number;
  ip: string;
  date: string;
  source: string;
  boutique: string;
  page: string;
}

interface ProductVisit {
  id: number;
  id_produit: number;
  product_name: string;
  date: string;
  lien: string;
  ip: string;
}

interface CartItem {
  id: number;
  product_name: string;
  prix: string;
  product_quantity: string;
  date: string;
}

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
  statusdemande: number;
}

interface FideliteTransaction {
  id: number;
  type: string;
  points: number;
  description: string;
  created_at: string;
}

interface Creance {
  id: number;
  client_nom: string;
  montant: number;
  montant_recu: number;
  date_echeance: string;
  statut: string;
  created_at: string;
}

interface Facture {
  id: number;
  numero: string;
  objet: string;
  montant_ht: number;
  montant_ttc: number;
  statut: string;
  date_echeance: string;
  created_at: string;
}

interface Devis {
  id: number;
  numero: string;
  objet: string;
  montant_ht: number;
  montant_ttc: number;
  statut: string;
  created_at: string;
}

interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

type TabKey = 'orders' | 'transactions' | 'visits' | 'cart' | 'contacts' | 'fidelite' | 'finances' | 'notes';

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'orders', label: 'Commandes', icon: 'ri-file-list-3-line' },
  { key: 'transactions', label: 'Transactions', icon: 'ri-exchange-dollar-line' },
  { key: 'visits', label: 'Visites', icon: 'ri-eye-line' },
  { key: 'cart', label: 'Panier', icon: 'ri-shopping-cart-line' },
  { key: 'contacts', label: 'Messages', icon: 'ri-message-3-line' },
  { key: 'fidelite', label: 'Fidélité', icon: 'ri-star-line' },
  { key: 'finances', label: 'Finances', icon: 'ri-bank-line' },
  { key: 'notes', label: 'Notes', icon: 'ri-sticky-note-line' },
];

function toNum(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export default function CustomerDetailPage({ initialTab = 'orders' }: { initialTab?: TabKey } = {}) {
  const params = useParams<{ customerId?: string; clientId?: string }>();
  const customerId = params.customerId || params.clientId || '';
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  const [clientInfo, setClientInfo] = useState<ClientInfo>({ name: '', email: '', phone: '', address: '' });
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([]);
  const [productVisits, setProductVisits] = useState<ProductVisit[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [fideliteTrans, setFideliteTrans] = useState<FideliteTransaction[]>([]);
  const [fidelitePoints, setFidelitePoints] = useState<number>(0);
  const [creances, setCreances] = useState<Creance[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [devis, setDevis] = useState<Devis[]>([]);

  const fetchAll = useCallback(async () => {
    if (!user || !customerId) return;
    setLoading(true);
    setError(null);
    try {
      const commerceId = user.id;
      const clientInt = parseInt(customerId, 10);
      const hasIntId = !Number.isNaN(clientInt);

      // Client info depuis clientshop (scopé au commerçant)
      const { data: shopClient } = await supabase
        .from('clientshop')
        .select('*')
        .eq('idshop', commerceId)
        .eq('idclient', customerId)
        .maybeSingle();

      if (shopClient) {
        setClientInfo({
          name: shopClient.nomclient || '',
          email: shopClient.email || '',
          phone: shopClient.telephone || '',
          address: shopClient.adresse || '',
        });
      }

      // Client info enrichie depuis users (si id numérique)
      if (hasIntId) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, email, telephone, adresse')
          .eq('id', clientInt)
          .maybeSingle();

        if (userData) {
          setClientInfo(prev => ({
            name: prev.name || userData.name || '',
            email: prev.email || userData.email || '',
            phone: prev.phone || userData.telephone || '',
            address: prev.address || userData.adresse || '',
          }));
        }
      }

      // Commandes du commerçant pour ce client
      const { data: commandesData } = await supabase
        .from('commande')
        .select('*')
        .eq('idvendeur', commerceId)
        .eq('user_id', customerId)
        .order('date_time', { ascending: false });

      if (commandesData && commandesData.length > 0) {
        setCommandes(commandesData as Commande[]);
        const first = commandesData[0];
        setClientInfo(prev => ({
          name: prev.name || first.nomclient || '',
          email: prev.email || first.email || '',
          phone: prev.phone || first.tel || '',
          address: prev.address || first.adresse || '',
        }));
      }

      // Transactions (paiements) du commerçant pour ce client
      if (hasIntId) {
        const { data: transData } = await supabase
          .from('transaction')
          .select('*')
          .eq('idcommerce', commerceId)
          .eq('idclient', clientInt)
          .order('date_time', { ascending: false });
        setTransactions((transData || []) as Transaction[]);
      }

      // Visites site
      const { data: siteVisitsData } = await supabase
        .from('visitesiteweb')
        .select('*')
        .eq('user_id', customerId)
        .order('date', { ascending: false })
        .limit(100);
      setSiteVisits((siteVisitsData || []) as SiteVisit[]);

      // Visites produits
      const { data: prodVisitsData } = await supabase
        .from('visiteproduitsiteweb')
        .select('*')
        .eq('user_id', customerId)
        .order('date', { ascending: false })
        .limit(100);
      setProductVisits((prodVisitsData || []) as ProductVisit[]);

      // Panier
      const { data: cartData } = await supabase
        .from('panier')
        .select('*')
        .eq('idclient', customerId)
        .order('date', { ascending: false });
      setCartItems((cartData || []) as CartItem[]);

      // Messages de contact
      const { data: contactData } = await supabase
        .from('contact_messages')
        .select('*')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false });
      setContactMessages((contactData || []) as ContactMessage[]);

      // Fidélité
      if (hasIntId) {
        const { data: fideliteData } = await supabase
          .from('pointfidelite')
          .select('*')
          .eq('user_id', clientInt)
          .eq('idcommerce', commerceId)
          .maybeSingle();
        if (fideliteData) {
          setFidelitePoints(toNum(fideliteData.points));
        }

        const { data: fideliteTransData } = await supabase
          .from('pointtransactions')
          .select('*')
          .eq('user_id', clientInt)
          .eq('idcommerce', commerceId)
          .order('created_at', { ascending: false })
          .limit(100);
        setFideliteTrans((fideliteTransData || []) as FideliteTransaction[]);

        // Créances
        const { data: creancesData } = await supabase
          .from('creances')
          .select('*')
          .eq('client_id', clientInt)
          .eq('idcommerce', commerceId)
          .order('created_at', { ascending: false });
        setCreances((creancesData || []) as Creance[]);

        // Factures
        const { data: facturesData } = await supabase
          .from('factures')
          .select('*')
          .eq('client_id', clientInt)
          .eq('idcommerce', commerceId)
          .order('created_at', { ascending: false });
        setFactures((facturesData || []) as Facture[]);

        // Devis
        const { data: devisData } = await supabase
          .from('devis')
          .select('*')
          .eq('client_id', clientInt)
          .eq('idcommerce', commerceId)
          .order('created_at', { ascending: false });
        setDevis((devisData || []) as Devis[]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [user, customerId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const commandeStatusBadge = (s: string) => {
    const val = (s || '').toLowerCase();
    if (val.includes('annul') || val.includes('refus')) return 'bg-red-100 text-red-700';
    if (val.includes('livr') || val.includes('termin') || val.includes('pay') || val.includes('accept') || val.includes('confir')) return 'bg-green-100 text-green-800';
    if (val.includes('attente') || val.includes('encours') || val.includes('en cours')) return 'bg-accent-100 text-accent-800';
    return 'bg-background-100 text-foreground-600';
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center py-32">
        <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
      </div>
    );
  }

  const waNumber = clientInfo.phone ? clientInfo.phone.replace(/[^0-9+]/g, '') : '';
  const hasContact = clientInfo.email || clientInfo.phone;
  const totalSpent = commandes.reduce((s, o) => s + (toNum(o.sommepayee) || toNum(o.totalttc)), 0)
    + transactions.reduce((s, t) => s + toNum(t.montant), 0);

  return (
    <div className="p-4 md:p-6">
      {/* Back + Header */}
      <button onClick={() => navigate('/dashboard/customers-manager')} className="flex items-center gap-1 text-sm text-foreground-500 hover:text-foreground-800 mb-3 cursor-pointer">
        <i className="ri-arrow-left-line"></i>
        <span>Retour à la liste</span>
      </button>

      <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-accent-100 flex items-center justify-center">
              <span className="text-xl font-bold text-accent-700">{clientInfo.name ? clientInfo.name.charAt(0).toUpperCase() : '?'}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading text-foreground-950">{clientInfo.name || `Client #${customerId}`}</h2>
              <p className="text-sm text-foreground-500">ID: {customerId}</p>
              <div className="flex flex-wrap gap-3 mt-2">
                {clientInfo.email && (
                  <span className="flex items-center gap-1.5 text-xs text-foreground-600">
                    <i className="ri-mail-line text-primary-500"></i>
                    {clientInfo.email}
                  </span>
                )}
                {clientInfo.phone && (
                  <span className="flex items-center gap-1.5 text-xs text-foreground-600">
                    <i className="ri-phone-line text-primary-500"></i>
                    {clientInfo.phone}
                  </span>
                )}
                {clientInfo.address && (
                  <span className="flex items-center gap-1.5 text-xs text-foreground-600">
                    <i className="ri-map-pin-line text-primary-500"></i>
                    {clientInfo.address}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-4 text-center items-start flex-wrap">
            <div className="bg-background-100 rounded-lg px-4 py-2">
              <p className="text-xs text-foreground-500">Commandes</p>
              <p className="text-lg font-bold text-foreground-950">{commandes.length}</p>
            </div>
            <div className="bg-background-100 rounded-lg px-4 py-2">
              <p className="text-xs text-foreground-500">Transactions</p>
              <p className="text-lg font-bold text-foreground-950">{transactions.length}</p>
            </div>
            <div className="bg-background-100 rounded-lg px-4 py-2">
              <p className="text-xs text-foreground-500">Total dépensé</p>
              <p className="text-lg font-bold text-primary-600">{totalSpent.toLocaleString()} MAD</p>
            </div>
            <div className="bg-background-100 rounded-lg px-4 py-2">
              <p className="text-xs text-foreground-500">Points fidélité</p>
              <p className="text-lg font-bold text-accent-600">{fidelitePoints}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate(`/dashboard/orders/new?customerId=${customerId}`)}
                className="flex items-center gap-2 px-4 py-2.5 bg-accent-500 text-background-50 rounded-full text-sm font-medium hover:bg-accent-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-add-circle-line"></i>
                <span>Créer une commande</span>
              </button>
              {hasContact && (
                <div className="relative">
                  <button
                    onClick={() => setContactOpen(!contactOpen)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-message-2-line"></i>
                    <span>Contacter</span>
                    <i className={`${contactOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-xs`}></i>
                  </button>
                  {contactOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setContactOpen(false)}></div>
                      <div className="absolute right-0 top-full mt-2 w-56 bg-background-50 border border-background-200/70 rounded-lg shadow-lg z-20 py-1">
                        {clientInfo.phone && (
                          <a
                            href={`https://wa.me/${waNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 text-sm text-foreground-800 hover:bg-background-100 transition-colors cursor-pointer"
                            onClick={() => setContactOpen(false)}
                          >
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                              <i className="ri-whatsapp-fill text-green-600"></i>
                            </div>
                            <div>
                              <p className="font-medium">WhatsApp</p>
                              <p className="text-xs text-foreground-500">{clientInfo.phone}</p>
                            </div>
                          </a>
                        )}
                        {clientInfo.email && (
                          <a
                            href={`mailto:${clientInfo.email}`}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-foreground-800 hover:bg-background-100 transition-colors cursor-pointer"
                            onClick={() => setContactOpen(false)}
                          >
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                              <i className="ri-mail-fill text-primary-600"></i>
                            </div>
                            <div>
                              <p className="font-medium">Email</p>
                              <p className="text-xs text-foreground-500">{clientInfo.email}</p>
                            </div>
                          </a>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <i className="ri-error-warning-line"></i>
          {error}
          <button onClick={fetchAll} className="ml-auto text-red-600 underline cursor-pointer">Réessayer</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-5 border-b border-background-200/70 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'bg-primary-500 text-background-50'
                : 'bg-background-50 text-foreground-600 hover:bg-background-100 border border-background-200/70'
            }`}
          >
            <i className={tab.icon}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
        {activeTab === 'orders' && (
          <OrdersTab commandes={commandes} formatDate={formatDate} commandeStatusBadge={commandeStatusBadge} />
        )}
        {activeTab === 'transactions' && (
          <TransactionsTab transactions={transactions} formatDate={formatDate} />
        )}
        {activeTab === 'visits' && (
          <VisitsTab siteVisits={siteVisits} productVisits={productVisits} formatDate={formatDate} />
        )}
        {activeTab === 'cart' && (
          <CartTab cartItems={cartItems} formatDate={formatDate} />
        )}
        {activeTab === 'contacts' && (
          <ContactsTab messages={contactMessages} formatDate={formatDate} />
        )}
        {activeTab === 'fidelite' && (
          <FideliteTab points={fidelitePoints} transactions={fideliteTrans} formatDate={formatDate} />
        )}
        {activeTab === 'finances' && (
          <FinancesTab creances={creances} factures={factures} devis={devis} formatDate={formatDate} />
        )}
        {activeTab === 'notes' && (
          <NotesTab commandes={commandes} onNoteSaved={fetchAll} />
        )}
      </div>
    </div>
  );
}

/* ──────────────── Orders Tab ──────────────── */
function OrdersTab({ commandes, formatDate, commandeStatusBadge }: { commandes: Commande[]; formatDate: (d: string) => string; commandeStatusBadge: (s: string) => string }) {
  if (commandes.length === 0) {
    return <div className="py-14 text-center text-foreground-500 text-sm">Aucune commande trouvée pour ce client</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-background-100 text-xs font-semibold text-foreground-500 uppercase">
            <th className="text-left px-4 py-3">N°</th>
            <th className="text-left px-4 py-3">Date</th>
            <th className="text-left px-4 py-3">Détail</th>
            <th className="text-left px-4 py-3">Statut</th>
            <th className="text-right px-4 py-3">Total</th>
            <th className="text-right px-4 py-3 hidden md:table-cell">Payé</th>
            <th className="text-left px-4 py-3 hidden md:table-cell">Paiement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-background-200/70">
          {commandes.map((o) => (
            <tr key={o.id} className="hover:bg-background-50/50">
              <td className="px-4 py-3 font-mono text-xs text-foreground-600">#{o.id}</td>
              <td className="px-4 py-3 text-foreground-600 text-xs whitespace-nowrap">{formatDate(o.date_time)}</td>
              <td className="px-4 py-3">
                <span className="text-foreground-800 text-xs font-medium">{o.titre || o.details || '-'}</span>
                {o.quantite > 1 && <span className="text-xs text-foreground-400 ml-1">×{o.quantite}</span>}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${commandeStatusBadge(o.statut_com_vendeur)}`}>
                  {o.statut_com_vendeur || 'En attente'}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-foreground-900 whitespace-nowrap">
                {toNum(o.totalttc || o.sommepayee).toLocaleString()} {o.monaie || 'MAD'}
              </td>
              <td className="px-4 py-3 text-right text-foreground-600 hidden md:table-cell whitespace-nowrap">
                {toNum(o.sommepayee).toLocaleString()} {o.monaie || 'MAD'}
              </td>
              <td className="px-4 py-3 text-left text-xs text-foreground-500 hidden md:table-cell">{o.methodepayment || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────── Transactions Tab ──────────────── */
function TransactionsTab({ transactions, formatDate }: { transactions: Transaction[]; formatDate: (d: string) => string }) {
  if (transactions.length === 0) {
    return <div className="py-14 text-center text-foreground-500 text-sm">Aucune transaction trouvée pour ce client</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-background-100 text-xs font-semibold text-foreground-500 uppercase">
            <th className="text-left px-4 py-3">N°</th>
            <th className="text-left px-4 py-3">Date</th>
            <th className="text-right px-4 py-3">Montant</th>
            <th className="text-left px-4 py-3">Méthode</th>
            <th className="text-left px-4 py-3">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-background-200/70">
          {transactions.map((t) => (
            <tr key={t.id} className="hover:bg-background-50/50">
              <td className="px-4 py-3 font-mono text-xs text-foreground-600">#{t.id}</td>
              <td className="px-4 py-3 text-foreground-600 text-xs whitespace-nowrap">{formatDate(t.date_time)}</td>
              <td className="px-4 py-3 text-right font-semibold text-primary-600 whitespace-nowrap">{toNum(t.montant).toLocaleString()} MAD</td>
              <td className="px-4 py-3 text-foreground-700 text-xs">{t.methode || '-'}</td>
              <td className="px-4 py-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  (t.statut || '').toLowerCase().includes('annul') || (t.statut || '').toLowerCase().includes('echou')
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {t.statut || 'Payée'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────── Visits Tab ──────────────── */
function VisitsTab({ siteVisits, productVisits, formatDate }: { siteVisits: SiteVisit[]; productVisits: ProductVisit[]; formatDate: (d: string) => string }) {
  return (
    <div className="divide-y divide-background-200/70">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground-800 mb-3 flex items-center gap-2">
          <i className="ri-globe-line text-primary-500"></i>
          Visites du site ({siteVisits.length})
        </h3>
        {siteVisits.length === 0 ? (
          <p className="text-xs text-foreground-500">Aucune visite enregistrée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-background-100 text-foreground-500">
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">IP</th>
                  <th className="text-left px-3 py-2 hidden sm:table-cell">Page</th>
                  <th className="text-left px-3 py-2 hidden md:table-cell">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-100">
                {siteVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-background-50/50">
                    <td className="px-3 py-2 text-foreground-600 whitespace-nowrap">{formatDate(v.date)}</td>
                    <td className="px-3 py-2 text-foreground-500 font-mono">{v.ip}</td>
                    <td className="px-3 py-2 text-foreground-600 hidden sm:table-cell">{v.page || '-'}</td>
                    <td className="px-3 py-2 text-foreground-500 hidden md:table-cell">{v.source || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground-800 mb-3 flex items-center gap-2">
          <i className="ri-shopping-bag-3-line text-accent-500"></i>
          Visites produits ({productVisits.length})
        </h3>
        {productVisits.length === 0 ? (
          <p className="text-xs text-foreground-500">Aucune visite produit enregistrée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-background-100 text-foreground-500">
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Produit</th>
                  <th className="text-left px-3 py-2 hidden sm:table-cell">Lien</th>
                  <th className="text-left px-3 py-2 hidden md:table-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-100">
                {productVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-background-50/50">
                    <td className="px-3 py-2 text-foreground-600 whitespace-nowrap">{formatDate(v.date)}</td>
                    <td className="px-3 py-2 text-foreground-800">#{v.id_produit}</td>
                    <td className="px-3 py-2 text-foreground-500 hidden sm:table-cell truncate max-w-[200px]">{v.lien || '-'}</td>
                    <td className="px-3 py-2 text-foreground-500 font-mono hidden md:table-cell">{v.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────── Cart Tab ──────────────── */
function CartTab({ cartItems, formatDate }: { cartItems: CartItem[]; formatDate: (d: string) => string }) {
  if (cartItems.length === 0) {
    return <div className="py-14 text-center text-foreground-500 text-sm">Aucun article dans le panier</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-background-100 text-xs font-semibold text-foreground-500 uppercase">
            <th className="text-left px-4 py-3">Date</th>
            <th className="text-left px-4 py-3">Produit</th>
            <th className="text-center px-4 py-3">Qté</th>
            <th className="text-right px-4 py-3">Prix</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-background-200/70">
          {cartItems.map((item) => (
            <tr key={item.id} className="hover:bg-background-50/50">
              <td className="px-4 py-3 text-xs text-foreground-600 whitespace-nowrap">{formatDate(item.date)}</td>
              <td className="px-4 py-3 text-foreground-800">{item.product_name || '-'}</td>
              <td className="px-4 py-3 text-center text-foreground-700">{item.product_quantity || '1'}</td>
              <td className="px-4 py-3 text-right font-semibold text-foreground-900">{item.prix || '0'} MAD</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────── Contacts Tab ──────────────── */
function ContactsTab({ messages, formatDate }: { messages: ContactMessage[]; formatDate: (d: string) => string }) {
  if (messages.length === 0) {
    return <div className="py-14 text-center text-foreground-500 text-sm">Aucun message ou contact</div>;
  }
  return (
    <div className="divide-y divide-background-200/70">
      {messages.map((m) => (
        <div key={m.id} className="p-4 hover:bg-background-50/50">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-semibold text-foreground-900">{m.subject || 'Sans objet'}</p>
              <p className="text-xs text-foreground-500">{m.name} · {m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {m.statusdemande === 1 ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Traité</span>
              ) : (
                <span className="text-xs bg-background-200/70 text-foreground-500 px-2 py-0.5 rounded-full">En attente</span>
              )}
              <span className="text-xs text-foreground-400 whitespace-nowrap">{formatDate(m.created_at)}</span>
            </div>
          </div>
          <p className="text-sm text-foreground-600 leading-relaxed">{m.message}</p>
        </div>
      ))}
    </div>
  );
}

/* ──────────────── Fidélité Tab ──────────────── */
function FideliteTab({ points, transactions, formatDate }: { points: number; transactions: FideliteTransaction[]; formatDate: (d: string) => string }) {
  return (
    <div className="divide-y divide-background-200/70">
      <div className="p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-accent-100 flex items-center justify-center">
          <i className="ri-star-fill text-2xl text-accent-600"></i>
        </div>
        <div>
          <p className="text-sm text-foreground-500">Points de fidélité</p>
          <p className="text-2xl font-bold text-accent-600">{points}</p>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground-800 mb-3">Historique des transactions ({transactions.length})</h3>
        {transactions.length === 0 ? (
          <p className="text-xs text-foreground-500">Aucune transaction de fidélité</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-background-100 text-foreground-500">
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-center px-3 py-2">Points</th>
                  <th className="text-left px-3 py-2 hidden sm:table-cell">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-background-50/50">
                    <td className="px-3 py-2 text-foreground-600 whitespace-nowrap">{formatDate(t.created_at)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${t.type === 'gain' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.type === 'gain' ? 'Gagné' : 'Utilisé'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-foreground-800">{t.points}</td>
                    <td className="px-3 py-2 text-foreground-500 hidden sm:table-cell">{t.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────── Finances Tab ──────────────── */
function FinancesTab({ creances, factures, devis, formatDate }: { creances: Creance[]; factures: Facture[]; devis: Devis[]; formatDate: (d: string) => string }) {
  return (
    <div className="divide-y divide-background-200/70">
      {/* Factures */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground-800 mb-3 flex items-center gap-2">
          <i className="ri-file-text-line text-primary-500"></i>
          Factures ({factures.length})
        </h3>
        {factures.length === 0 ? (
          <p className="text-xs text-foreground-500">Aucune facture</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-background-100 text-foreground-500">
                  <th className="text-left px-3 py-2">N°</th>
                  <th className="text-left px-3 py-2">Objet</th>
                  <th className="text-right px-3 py-2">HT</th>
                  <th className="text-right px-3 py-2 hidden sm:table-cell">TTC</th>
                  <th className="text-left px-3 py-2 hidden md:table-cell">Échéance</th>
                  <th className="text-left px-3 py-2">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-100">
                {factures.map((f) => (
                  <tr key={f.id} className="hover:bg-background-50/50">
                    <td className="px-3 py-2 font-mono text-foreground-600">{f.numero}</td>
                    <td className="px-3 py-2 text-foreground-800">{f.objet}</td>
                    <td className="px-3 py-2 text-right text-foreground-700">{toNum(f.montant_ht).toLocaleString()} MAD</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground-800 hidden sm:table-cell">{toNum(f.montant_ttc).toLocaleString()} MAD</td>
                    <td className="px-3 py-2 text-foreground-500 hidden md:table-cell">{f.date_echeance ? new Date(f.date_echeance).toLocaleDateString('fr-FR') : '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${f.statut === 'payée' || f.statut === 'paye' ? 'bg-green-100 text-green-700' : 'bg-background-200/70 text-foreground-600'}`}>
                        {f.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Devis */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground-800 mb-3 flex items-center gap-2">
          <i className="ri-draft-line text-accent-500"></i>
          Devis ({devis.length})
        </h3>
        {devis.length === 0 ? (
          <p className="text-xs text-foreground-500">Aucun devis</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-background-100 text-foreground-500">
                  <th className="text-left px-3 py-2">N°</th>
                  <th className="text-left px-3 py-2">Objet</th>
                  <th className="text-right px-3 py-2">HT</th>
                  <th className="text-right px-3 py-2 hidden sm:table-cell">TTC</th>
                  <th className="text-left px-3 py-2">Statut</th>
                  <th className="text-left px-3 py-2 hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-100">
                {devis.map((d) => (
                  <tr key={d.id} className="hover:bg-background-50/50">
                    <td className="px-3 py-2 font-mono text-foreground-600">{d.numero}</td>
                    <td className="px-3 py-2 text-foreground-800">{d.objet}</td>
                    <td className="px-3 py-2 text-right text-foreground-700">{toNum(d.montant_ht).toLocaleString()} MAD</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground-800 hidden sm:table-cell">{toNum(d.montant_ttc).toLocaleString()} MAD</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.statut === 'accepté' || d.statut === 'accepte' ? 'bg-green-100 text-green-700' : d.statut === 'refusé' ? 'bg-red-100 text-red-700' : 'bg-background-200/70 text-foreground-600'}`}>
                        {d.statut}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-foreground-500 hidden md:table-cell">{formatDate(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Créances */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground-800 mb-3 flex items-center gap-2">
          <i className="ri-money-dollar-circle-line text-secondary-500"></i>
          Créances ({creances.length})
        </h3>
        {creances.length === 0 ? (
          <p className="text-xs text-foreground-500">Aucune créance</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-background-100 text-foreground-500">
                  <th className="text-left px-3 py-2">Client</th>
                  <th className="text-right px-3 py-2">Montant</th>
                  <th className="text-right px-3 py-2 hidden sm:table-cell">Reçu</th>
                  <th className="text-right px-3 py-2">Reste</th>
                  <th className="text-left px-3 py-2 hidden md:table-cell">Échéance</th>
                  <th className="text-left px-3 py-2">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-100">
                {creances.map((c) => (
                  <tr key={c.id} className="hover:bg-background-50/50">
                    <td className="px-3 py-2 text-foreground-800">{c.client_nom}</td>
                    <td className="px-3 py-2 text-right text-foreground-700">{toNum(c.montant).toLocaleString()} MAD</td>
                    <td className="px-3 py-2 text-right text-foreground-600 hidden sm:table-cell">{toNum(c.montant_recu).toLocaleString()} MAD</td>
                    <td className="px-3 py-2 text-right font-semibold text-red-600">{toNum(c.montant - c.montant_recu).toLocaleString()} MAD</td>
                    <td className="px-3 py-2 text-foreground-500 hidden md:table-cell">{c.date_echeance ? new Date(c.date_echeance).toLocaleDateString('fr-FR') : '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.statut === 'payée' || c.statut === 'paye' ? 'bg-green-100 text-green-700' : 'bg-accent-100 text-accent-700'}`}>
                        {c.statut || 'En cours'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────── Notes Tab ──────────────── */
function NotesTab({ commandes, onNoteSaved }: { commandes: Commande[]; onNoteSaved: () => void }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  const commandesWithNotes = commandes.filter(o => o.notevendeur);

  const startEdit = (o: Commande) => {
    setEditingId(o.id);
    setEditText(o.notevendeur || '');
  };

  const saveNote = async (commandeId: number) => {
    setSaving(true);
    const { error } = await supabase
      .from('commande')
      .update({ notevendeur: editText })
      .eq('id', commandeId);
    if (!error) {
      setEditingId(null);
      onNoteSaved();
    }
    setSaving(false);
  };

  return (
    <div className="divide-y divide-background-200/70">
      {commandesWithNotes.length === 0 ? (
        <div className="py-14 text-center text-foreground-500 text-sm">
          <i className="ri-sticky-note-line text-3xl text-foreground-300 block mb-2"></i>
          Aucune note interne sur les commandes de ce client.
        </div>
      ) : (
        commandesWithNotes.map((o) => (
          <div key={o.id} className="p-4 hover:bg-background-50/50">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-foreground-500">Commande #{o.id}</span>
                <span className="text-xs text-foreground-400">
                  {new Date(o.date_time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              {editingId === o.id ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingId(null)} className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer">
                    Annuler
                  </button>
                  <button
                    onClick={() => saveNote(o.id)}
                    disabled={saving}
                    className="text-xs px-3 py-1 bg-primary-500 text-background-50 rounded-full hover:bg-primary-600 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? '...' : 'Enregistrer'}
                  </button>
                </div>
              ) : (
                <button onClick={() => startEdit(o)} className="text-xs text-foreground-400 hover:text-primary-500 cursor-pointer flex items-center gap-1">
                  <i className="ri-edit-line"></i>
                  Modifier
                </button>
              )}
            </div>
            {editingId === o.id ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300 resize-none"
                autoFocus
                maxLength={500}
              ></textarea>
            ) : (
              <p className="text-sm text-foreground-700 leading-relaxed bg-background-100 rounded-md p-3">{o.notevendeur}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}