import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { useCart } from '@/hooks/useCart';
import { trackPurchase } from '@/lib/facebookPixel';

export default function CommandePublic() {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { items, subtotal, currency, clearCart } = useCart();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  const totalCount = items.reduce((s, i) => s + i.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (!cleanName) {
      setError('Veuillez indiquer votre nom.');
      return;
    }
    if (!cleanPhone) {
      setError('Veuillez indiquer votre numéro de téléphone pour que nous puissions vous contacter.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const details = items
        .map((i) => `${i.product.name} ×${i.quantity}`)
        .join(', ');
      const clientId = cleanPhone || email.trim() || `invite_${Date.now()}`;

      const { data, error: orderError } = await supabase
        .from('commande')
        .insert({
          idvendeur: tenant?.id ?? 0,
          titre: `Commande ${tenant?.nomcommerce || 'boutique'}`,
          typecommande: 'produit',
          serviceouproduit: 1,
          nomclient: cleanName,
          email: email.trim(),
          tel: cleanPhone,
          adresse: address.trim(),
          whatsapp: cleanPhone,
          details,
          user_id: clientId,
          monaie: currency,
          methodepayment: 'A convenir',
          totalht: String(subtotal),
          totalttc: String(subtotal),
          quantite: totalCount,
          statut_com_vendeur: 'En attente',
          ville: city.trim(),
          noteclient: notes.trim(),
          date_time: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      // Suivi Facebook Pixel : achat réalisé
      trackPurchase({
        value: subtotal,
        currency,
        content_ids: items.map((i) => String(i.product.id)),
        num_items: totalCount,
      });

      setOrderId(data?.id ?? null);
      setPlaced(true);
      clearCart();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue lors de l'envoi de votre commande."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Écran de confirmation
  if (placed) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-accent-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-check-line text-3xl text-accent-600"></i>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-foreground-950 mb-2">
            Commande envoyée !
          </h1>
          <p className="text-foreground-500 mb-6">
            Merci pour votre commande{orderId ? ` (n° ${orderId})` : ''}. Nous vous contacterons
            rapidement pour convenir de la livraison et du paiement.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              Continuer mes achats
            </button>
            <Link
              to="/"
              className="px-6 py-2.5 bg-background-100 text-foreground-700 rounded-full text-sm font-medium hover:bg-background-200/70 transition-colors cursor-pointer no-underline whitespace-nowrap"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Panier vide
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-shopping-cart-line text-2xl text-foreground-400"></i>
          </div>
          <h1 className="text-xl font-bold font-heading text-foreground-950 mb-2">Votre panier est vide</h1>
          <p className="text-foreground-500 mb-6">Ajoutez des produits avant de passer commande.</p>
          <Link
            to="/products"
            className="px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer no-underline whitespace-nowrap"
          >
            Voir les produits
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-50">
      <section className="relative py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background-100/50 to-transparent"></div>
        <div className="relative w-full px-4 md:px-6 max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold font-heading text-foreground-950 mb-2">
            Finaliser ma commande
          </h1>
          <p className="text-sm text-foreground-500">Renseignez vos coordonnées, nous vous recontactons</p>
        </div>
      </section>

      <section className="pb-12 md:pb-16">
        <div className="w-full px-4 md:px-6 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="lg:col-span-3 bg-background-50 border border-background-200/70 rounded-lg p-5 md:p-6 space-y-4">
              <div>
                <label htmlFor="cmd-name" className="block text-sm font-medium text-foreground-700 mb-1.5">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  id="cmd-name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300"
                  required
                />
              </div>

              <div>
                <label htmlFor="cmd-phone" className="block text-sm font-medium text-foreground-700 mb-1.5">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <input
                  id="cmd-phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex : 06 12 34 56 78"
                  className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300"
                  required
                />
              </div>

              <div>
                <label htmlFor="cmd-email" className="block text-sm font-medium text-foreground-700 mb-1.5">
                  Email
                </label>
                <input
                  id="cmd-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Votre email"
                  className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cmd-city" className="block text-sm font-medium text-foreground-700 mb-1.5">
                    Ville
                  </label>
                  <input
                    id="cmd-city"
                    name="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Votre ville"
                    className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300"
                  />
                </div>
                <div>
                  <label htmlFor="cmd-address" className="block text-sm font-medium text-foreground-700 mb-1.5">
                    Adresse
                  </label>
                  <input
                    id="cmd-address"
                    name="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Votre adresse"
                    className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cmd-notes" className="block text-sm font-medium text-foreground-700 mb-1.5">
                  Remarques
                </label>
                <textarea
                  id="cmd-notes"
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Précisions utiles (point de livraison, créneau, etc.)"
                  className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 resize-none"
                ></textarea>
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                  <i className="ri-error-warning-line"></i>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-primary-500 text-background-50 rounded-full text-sm font-bold hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {submitting ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line"></i>
                    Confirmer ma commande
                  </>
                )}
              </button>
            </form>

            {/* Résumé */}
            <div className="lg:col-span-2">
              <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 sticky top-20">
                <h2 className="text-sm font-bold font-heading text-foreground-950 mb-4 flex items-center gap-2">
                  <i className="ri-receipt-line text-primary-500"></i>
                  Récapitulatif
                </h2>
                <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-background-100 overflow-hidden flex-shrink-0">
                        {item.product.media ? (
                          <img
                            src={item.product.media}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <i className="ri-shopping-bag-line text-foreground-300"></i>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground-900 truncate">{item.product.name}</p>
                        <p className="text-xs text-foreground-400">×{item.quantity}</p>
                      </div>
                      <span className="text-xs font-semibold text-foreground-800 whitespace-nowrap">
                        {(item.product.price * item.quantity).toLocaleString()} {currency}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-background-200/70 pt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground-500">Sous-total</span>
                    <span className="text-foreground-800 tabular-nums">{subtotal.toLocaleString()} {currency}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t border-background-200/70">
                    <span className="text-foreground-950">Total</span>
                    <span className="text-primary-600 tabular-nums">{subtotal.toLocaleString()} {currency}</span>
                  </div>
                </div>

                <p className="text-xs text-foreground-400 mt-3 leading-relaxed">
                  Aucun paiement en ligne n&apos;est demandé. Le paiement se fera à la livraison ou selon
                  vos convenances.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}