import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  final_price: number;
  subtotal: number;
}

interface OrderHeader {
  id: number;
  status: string;
  currency: string;
  subtotal_items: number;
  tax_total: number;
  shipping_total: number;
  discount_price: number;
  payment_provider: string;
  recipient: Record<string, unknown>;
  created_at: string;
  customer_notes: string;
  admin_notes?: string;
  items: OrderItem[];
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

type TabKey = 'orders' | 'visits' | 'cart' | 'contacts' | 'fidelite' | 'finances' | 'notes';

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'orders', label: 'Commandes', icon: 'ri-file-list-3-line' },
  { key: 'visits', label: 'Visites', icon: 'ri-eye-line' },
  { key: 'cart', label: 'Panier', icon: 'ri-shopping-cart-line' },
  { key: 'contacts', label: 'Messages', icon: 'ri-message-3-line' },
  { key: 'fidelite', label: 'Fidélité', icon: 'ri-star-line' },
  { key: 'finances', label: 'Finances', icon: 'ri-bank-line' },
  { key: 'notes', label: 'Notes', icon: 'ri-sticky-note-line' },
];

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
  const [orders, setOrders] = useState<OrderHeader[]>([]);
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

      // Client info from users table
      const { data: userData } = await supabase
        .from('users')
        .select('id, name, email, telephone, adresse')
        .eq('id', customerId)
        .maybeSingle();

      if (userData) {
        setClientInfo({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.telephone || '',
          address: userData.adresse || '',
        });
      }

      // Client info from mesclients
      const { data: mesclientData } = await supabase
        .from('mesclients')
        .select('*')
        .eq('idclient', customerId)
        .eq('idshop', commerceId)
        .maybeSingle();

      if (mesclientData && !userData?.name) {
        setClientInfo(prev => ({ ...prev, name: prev.name || '' }));
      }

      // Orders from order_headers
      const { data: ordersData } = await supabase
        .from('order_headers')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (ordersData && ordersData.length > 0) {
        const ordersWithItems = await Promise.all(
          ordersData.map(async (o) => {
            const { data: items } = await supabase
              .from('order_items')
              .select('*')
              .eq('order_id', o.id);
            const recipient = o.recipient as Record<string, unknown> || {};
            if (!clientInfo.name && recipient.name) setClientInfo(prev => ({ ...prev, name: String(recipient.name || '') }));
            if (!clientInfo.email && recipient.email) setClientInfo(prev => ({ ...prev, email: String(recipient.email || '') }));
            if (!clientInfo.phone && recipient.phone) setClientInfo(prev => ({ ...prev, phone: String(recipient.phone || '') }));
            return { ...o, items: (items || []) as OrderItem[] };
          })
        );
        setOrders(ordersWithItems as OrderHeader[]);
      }

      // Orders from commande table
      const { data: commandesData } = await supabase
        .from('commande')
        .select('*')
        .eq('user_id', customerId)
        .order('date_time', { ascending: false })
        .limit(50);

      // Site visits
      const { data: siteVisitsData } = await supabase
        .from('visitesiteweb')
        .select('*')
        .eq('user_id', customerId)
        .order('date', { ascending: false })
        .limit(100);
      setSiteVisits((siteVisitsData || []) as SiteVisit[]);

      // Product visits
      const { data: prodVisitsData } = await supabase
        .from('visiteproduitsiteweb')
        .select('*')
        .eq('user_id', customerId)
        .order('date', { ascending: false })
        .limit(100);
      setProductVisits((prodVisitsData || []) as ProductVisit[]);

      // Cart
      const { data: cartData } = await supabase
        .from('panier')
        .select('*')
        .eq('idclient', customerId)
        .order('date', { ascending: false });
      setCartItems((cartData || []) as CartItem[]);

      // Contact messages
      const { data: contactData } = await supabase
        .from('contact_messages')
        .select('*')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false });
      setContactMessages((contactData || []) as ContactMessage[]);

      // Fidélité
      const { data: fideliteData } = await supabase
        .from('pointfidelite')
        .select('*')
        .eq('user_id', customerId)
        .eq('idcommerce', commerceId)
        .maybeSingle();
      if (fideliteData) {
        setFidelitePoints(Number(fideliteData.points) || 0);
      }

      const { data: fideliteTransData } = await supabase
        .from('pointtransactions')
        .select('*')
        .eq('user_id', customerId)
        .eq('idcommerce', commerceId)
        .order('created_at', { ascending: false })
        .limit(100);
      setFideliteTrans((fideliteTransData || []) as FideliteTransaction[]);

      // Créances
      const { data: creancesData } = await supabase
        .from('creances')
        .select('*')
        .eq('client_id', customerId)
        .eq('idcommerce', commerceId)
        .order('created_at', { ascending: false });
      setCreances((creancesData || []) as Creance[]);

      // Factures
      const { data: facturesData } = await supabase
        .from('factures')
        .select('*')
        .eq('client_id', customerId)
        .eq('idcommerce', commerceId)
        .order('created_at', { ascending: false });
      setFactures((facturesData || []) as Facture[]);

      // Devis
      const { data: devisData } = await supabase
        .from('devis')
        .select('*')
        .eq('client_id', customerId)
        .eq('idcommerce', commerceId)
        .order('created_at', { ascending: false });
      setDevis((devisData || []) as Devis[]);

      // If no name yet, try from commande
      if (!clientInfo.name && commandesData && commandesData.length > 0) {
        setClientInfo(prev => ({
          ...prev,
          name: commandesData[0].nomclient || '',
          email: prev.email || commandesData[0].email || '',
          phone: prev.phone || commandesData[0].tel || '',
          address: prev.address || commandesData[0].adresse || '',
        }));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [user, customerId, clientInfo.name, clientInfo.email, clientInfo.phone]);

  useEffect(() => { fetchAll(); }, []);

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending_payment: 'bg-background-200/70 text-foreground-600',
      paid: 'bg-secondary-100 text-secondary-800',
      processing: 'bg-accent-100 text-accent-800',
      shipped: 'bg-primary-100 text-primary-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-700',
      refunded: 'bg-background-200/70 text-foreground-500',
    };
    return `inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[s] || 'bg-background-100 text-foreground-600'}`;
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

  return (
    <div className="p-4 md:p-6">
      {/* Back + Header */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-foreground-500 hover:text-foreground-800 mb-3 cursor-pointer">
        <i className="ri-arrow-left-line"></i>
        <span>Retour</span>
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
          <div className="flex gap-4 text-center items-start">
            <div className="bg-background-100 rounded-lg px-4 py-2">
              <p className="text-xs text-foreground-500">Commandes</p>
              <p className="text-lg font-bold text-foreground-950">{orders.length}</p>
            </div>
            <div className="bg-background-100 rounded-lg px-4 py-2">
              <p className="text-xs text-foreground-500">Total dépensé</p>
              <p className="text-lg font-bold text-primary-600">
                {orders.reduce((s, o) => s + (o.subtotal_items || 0) + (o.tax_total || 0) - (o.discount_price || 0), 0).toLocaleString()} MAD
              </p>
            </div>
            <div className="bg-background-100 rounded-lg px-4 py-2">
              <p className="text-xs text-foreground-500">Points fidélité</p>
              <p className="text-lg font-bold text-accent-600">{fidelitePoints}</p>
            </div>
            {/* ── Contacter + Créer commande ── */}
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
          <OrdersTab orders={orders} formatDate={formatDate} statusBadge={statusBadge} />
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
          <NotesTab orders={orders} onNoteSaved={fetchAll} />
        )}
      </div>
    </div>
  );
}

/* ──────────────── Orders Tab ──────────────── */
function OrdersTab({ orders, formatDate, statusBadge }: { orders: OrderHeader[]; formatDate: (d: string) => string; statusBadge: (s: string) => string }) {
  if (orders.length === 0) {
    return <div className="py-14 text-center text-foreground-500 text-sm">Aucune commande trouvée pour ce client</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-background-100 text-xs font-semibold text-foreground-500 uppercase">
            <th className="text-left px-4 py-3">N° Commande</th>
            <th className="text-left px-4 py-3">Date</th>
            <th className="text-left px-4 py-3">Statut</th>
            <th className="text-left px-4 py-3">Produits</th>
            <th className="text-right px-4 py-3">Total</th>
            <th className="text-right px-4 py-3 hidden md:table-cell">Paiement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-background-200/70">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-background-50/50">
              <td className="px-4 py-3 font-mono text-xs text-foreground-600">#{o.id}</td>
              <td className="px-4 py-3 text-foreground-600 text-xs">{formatDate(o.created_at)}</td>
              <td className="px-4 py-3"><span className={statusBadge(o.status)}>{o.status}</span></td>
              <td className="px-4 py-3">
                {o.items.slice(0, 3).map((it) => (
                  <div key={it.id} className="text-foreground-800 text-xs">{it.product_name} ×{it.quantity}</div>
                ))}
                {o.items.length > 3 && <span className="text-xs text-foreground-400">+{o.items.length - 3} autres</span>}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-foreground-900">
                {((o.subtotal_items || 0) + (o.tax_total || 0) - (o.discount_price || 0)).toLocaleString()} {o.currency}
              </td>
              <td className="px-4 py-3 text-right text-xs text-foreground-500 hidden md:table-cell">{o.payment_provider}</td>
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
                    <td className="px-3 py-2 text-foreground-600">{formatDate(v.date)}</td>
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
                    <td className="px-3 py-2 text-foreground-600">{formatDate(v.date)}</td>
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
              <td className="px-4 py-3 text-xs text-foreground-600">{formatDate(item.date)}</td>
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
              <span className="text-xs text-foreground-400">{formatDate(m.created_at)}</span>
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
                    <td className="px-3 py-2 text-foreground-600">{formatDate(t.created_at)}</td>
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
                    <td className="px-3 py-2 text-right text-foreground-700">{f.montant_ht?.toLocaleString()} MAD</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground-800 hidden sm:table-cell">{f.montant_ttc?.toLocaleString()} MAD</td>
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
                    <td className="px-3 py-2 text-right text-foreground-700">{d.montant_ht?.toLocaleString()} MAD</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground-800 hidden sm:table-cell">{d.montant_ttc?.toLocaleString()} MAD</td>
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
                    <td className="px-3 py-2 text-right text-foreground-700">{c.montant?.toLocaleString()} MAD</td>
                    <td className="px-3 py-2 text-right text-foreground-600 hidden sm:table-cell">{c.montant_recu?.toLocaleString()} MAD</td>
                    <td className="px-3 py-2 text-right font-semibold text-red-600">{(c.montant - c.montant_recu)?.toLocaleString()} MAD</td>
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
function NotesTab({ orders, onNoteSaved }: { orders: OrderHeader[]; onNoteSaved: () => void }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [generalNote, setGeneralNote] = useState('');
  const [savingGeneral, setSavingGeneral] = useState(false);

  const ordersWithNotes = orders.filter(o => o.admin_notes);

  const startEdit = (order: OrderHeader) => {
    setEditingId(order.id);
    setEditText(order.admin_notes || '');
  };

  const saveNote = async (orderId: number) => {
    setSaving(true);
    const { error } = await supabase
      .from('order_headers')
      .update({ admin_notes: editText })
      .eq('id', orderId);
    if (!error) {
      setEditingId(null);
      onNoteSaved();
    }
    setSaving(false);
  };

  return (
    <div className="divide-y divide-background-200/70">
      {ordersWithNotes.length === 0 ? (
        <div className="py-14 text-center text-foreground-500 text-sm">
          <i className="ri-sticky-note-line text-3xl text-foreground-300 block mb-2"></i>
          Aucune note interne. Ajoutez des notes admin depuis une commande.
        </div>
      ) : (
        ordersWithNotes.map((o) => (
          <div key={o.id} className="p-4 hover:bg-background-50/50">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-foreground-500">Commande #{o.id}</span>
                <span className="text-xs text-foreground-400">
                  {new Date(o.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              {editingId === o.id ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer"
                  >
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
                <button
                  onClick={() => startEdit(o)}
                  className="text-xs text-foreground-400 hover:text-primary-500 cursor-pointer flex items-center gap-1"
                >
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
              <p className="text-sm text-foreground-700 leading-relaxed bg-background-100 rounded-md p-3">
                {o.admin_notes}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}