import { useState } from 'react';
import { useTenant } from '@/hooks/useTenant';

export default function BookingFormTag() {
  const { tenant } = useTenant();
  const [showForm, setShowForm] = useState(false);

  if (!tenant) return null;

  const storeName = tenant.nomcommerce || tenant.name || '';

  if (!showForm) {
    return (
      <div className="max-w-md mx-auto text-center py-8">
        <div className="w-14 h-14 rounded-full bg-accent-50 flex items-center justify-center mx-auto mb-4">
          <i className="ri-calendar-check-line text-2xl text-accent-600"></i>
        </div>
        <h3 className="text-lg font-bold font-heading text-foreground-950 mb-2">
          Prendre un rendez-vous
        </h3>
        <p className="text-sm text-foreground-500 mb-5">
          Réservez un créneau avec {storeName}
        </p>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors whitespace-nowrap"
        >
          <i className="ri-calendar-line"></i>
          Voir les disponibilités
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-background-50 border border-background-200/70 rounded-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold font-heading text-foreground-950">
            <i className="ri-calendar-check-line mr-2 text-primary-500"></i>
            Réservation
          </h3>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-400 hover:text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>

        <p className="text-sm text-foreground-500 mb-5">
          Veuillez nous contacter directement pour prendre rendez-vous.
        </p>

        {tenant.telephone && (
          <a
            href={`tel:${tenant.telephone}`}
            className="flex items-center gap-3 p-3 rounded-lg bg-background-100 hover:bg-background-200/70 transition-colors no-underline mb-3"
          >
            <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
              <i className="ri-phone-line text-primary-600"></i>
            </div>
            <div>
              <span className="text-xs text-foreground-500 block">Téléphone</span>
              <span className="text-sm font-medium text-foreground-900">{tenant.telephone}</span>
            </div>
          </a>
        )}

        {tenant.email && (
          <a
            href={`mailto:${tenant.email}`}
            className="flex items-center gap-3 p-3 rounded-lg bg-background-100 hover:bg-background-200/70 transition-colors no-underline"
          >
            <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
              <i className="ri-mail-line text-primary-600"></i>
            </div>
            <div>
              <span className="text-xs text-foreground-500 block">Email</span>
              <span className="text-sm font-medium text-foreground-900">{tenant.email}</span>
            </div>
          </a>
        )}

        <a
          href="/booking"
          className="mt-4 flex items-center justify-center gap-2 w-full px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors whitespace-nowrap no-underline"
        >
          <i className="ri-calendar-line"></i>
          Page de réservation complète
        </a>
      </div>
    </div>
  );
}