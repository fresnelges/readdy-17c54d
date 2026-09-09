import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface OrderHeader {
  id: number;
  customer_id: string | null;
  status: string;
  currency: string;
  subtotal_items: number | null;
  shipping_total: number | null;
  tax_total: number | null;
  discount_price: number | null;
  payment_provider: string;
  recipient: Record<string, string> | null;
  created_at: string;
  order_items?: OrderItem[];
}

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  final_price: number | null;
  subtotal: number | null;
  sku_label: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending_payment: { label: 'Paiement en attente', className: 'bg-amber-100 text-amber-700' },
  paid: { label: 'Payée', className: 'bg-accent-100 text-accent-700' },
  processing: { label: 'En traitement', className: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Expédiée', className: 'bg-secondary-100 text-secondary-700' },
  delivered: { label: 'Livrée', className: 'bg-primary-100 text-primary-700' },
  cancelled: { label: 'Annulée', className: 'bg-red-100 text-red-700' },
  refunded: { label: 'Remboursée', className: 'bg-background-200 text-foreground-600' },
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  const getTotal = (order: OrderHeader) => {
    const subtotal = order.subtotal_items || 0;
    const shipping = order.shipping_total || 0;
    const tax = order.tax_total || 0;
    const discount = order.discount_price || 0;
    return subtotal + shipping + tax - discount;
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('order_headers')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setOrders(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (user) fetchOrders();
  }, [fetchOrders, user]);

  const updateStatus = async (orderId: number, newStatus: string) => {
    const { error: updateError } = await supabase
      .from('order_headers')
      .update({ status: newStatus })
      .eq('id', orderId);
    if (!updateError) fetchOrders();
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Commandes</h2>
          <p className="text-sm text-foreground-500 mt-1">Suivez et gérez toutes les commandes</p>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { value: 'all', label: 'Toutes' },
          { value: 'pending_payment', label: 'En attente' },
          { value: 'paid', label: 'Payées' },
          { value: 'processing', label: 'Traitement' },
          { value: 'shipped', label: 'Expédiées' },
          { value: 'delivered', label: 'Livrées' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              statusFilter === f.value
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
          <button onClick={fetchOrders} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors">
            Réessayer
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
            <i className="ri-file-list-3-line text-2xl text-foreground-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-foreground-800 mb-1">Aucune commande</h3>
          <p className="text-sm text-foreground-500">Les commandes apparaîtront ici quand vous en recevrez</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending_payment;
            const isExpanded = expandedOrder === order.id;
            const recipientName = order.recipient?.name || 'Client';

            return (
              <div key={order.id} className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
                <div
                  className="flex flex-wrap items-center gap-3 px-5 py-4 cursor-pointer hover:bg-background-50/80 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="min-w-[80px]">
                    <span className="text-xs text-foreground-400">#{order.id}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground-900 truncate">{recipientName}</div>
                    <div className="text-xs text-foreground-500">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-foreground-900 whitespace-nowrap">
                    {getTotal(order).toLocaleString()} {order.currency}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusCfg.className}`}>
                    {statusCfg.label}
                  </span>
                  {isExpanded ? (
                    <i className="ri-arrow-up-s-line text-foreground-400"></i>
                  ) : (
                    <i className="ri-arrow-down-s-line text-foreground-400"></i>
                  )}
                </div>

                {isExpanded && (
                  <div className="px-5 py-4 border-t border-background-200/70 bg-background-50/50">
                    {/* Order details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      {order.recipient?.email && (
                        <div>
                          <span className="text-xs text-foreground-400 block">Email</span>
                          <span className="text-foreground-900">{order.recipient.email}</span>
                        </div>
                      )}
                      {order.recipient?.phone && (
                        <div>
                          <span className="text-xs text-foreground-400 block">Téléphone</span>
                          <span className="text-foreground-900">{order.recipient.phone}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-foreground-400 block">Paiement</span>
                        <span className="text-foreground-900 capitalize">{order.payment_provider}</span>
                      </div>
                      <div>
                        <span className="text-xs text-foreground-400 block">Statut</span>
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs bg-background-50 border border-background-200/70 rounded px-2 py-1 text-foreground-900 cursor-pointer focus:outline-none"
                        >
                          {Object.keys(STATUS_CONFIG).map((s) => (
                            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Order items */}
                    {order.order_items && order.order_items.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">Articles</h4>
                        <div className="space-y-2">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-5 h-5 rounded bg-secondary-100 flex items-center justify-center text-xs text-secondary-700 font-medium flex-shrink-0">
                                  {item.quantity}
                                </span>
                                <span className="text-foreground-900 truncate">{item.product_name}</span>
                                {item.sku_label && (
                                  <span className="text-xs text-foreground-400 whitespace-nowrap">({item.sku_label})</span>
                                )}
                              </div>
                              <span className="text-foreground-700 font-medium whitespace-nowrap">
                                {((item.final_price || item.unit_price) * item.quantity).toLocaleString()} {order.currency}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Totals */}
                        <div className="mt-3 pt-3 border-t border-background-200/70 space-y-1 text-sm">
                          <div className="flex justify-between text-foreground-500">
                            <span>Sous-total</span>
                            <span>{order.subtotal_items?.toLocaleString() || '0'} {order.currency}</span>
                          </div>
                          {order.shipping_total ? (
                            <div className="flex justify-between text-foreground-500">
                              <span>Livraison</span>
                              <span>{order.shipping_total.toLocaleString()} {order.currency}</span>
                            </div>
                          ) : null}
                          {order.tax_total ? (
                            <div className="flex justify-between text-foreground-500">
                              <span>Taxes</span>
                              <span>{order.tax_total.toLocaleString()} {order.currency}</span>
                            </div>
                          ) : null}
                          {order.discount_price ? (
                            <div className="flex justify-between text-accent-600">
                              <span>Remise</span>
                              <span>-{order.discount_price.toLocaleString()} {order.currency}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between font-bold text-foreground-950 pt-1 border-t border-background-200/70">
                            <span>Total</span>
                            <span>{getTotal(order).toLocaleString()} {order.currency}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {orders.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-foreground-500">
          <span>{orders.length} commande{orders.length > 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}