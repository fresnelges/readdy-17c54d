import { useState, type FormEvent } from 'react';
import { useTenant } from '@/hooks/useTenant';

const FORM_URL = 'https://readdy.ai/api/form/d8tsr0cuatl81q3tfot0';

export default function ContactFormTag() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { tenant } = useTenant();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Honeypot check
    const honeypot = formData.get('website_alt') as string;
    if (honeypot?.trim()) {
      setStatus('success');
      setMessage('Message envoyé avec succès !');
      form.reset();
      return;
    }
    formData.delete('website_alt');

    try {
      const params = new URLSearchParams();
      formData.forEach((value, key) => {
        params.append(key, value as string);
      });

      const res = await fetch(FORM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (res.ok) {
        setStatus('success');
        setMessage('Message envoyé avec succès !');
        form.reset();
      } else {
        setStatus('error');
        setMessage("Erreur lors de l'envoi. Veuillez réessayer.");
      }
    } catch {
      setStatus('error');
      setMessage("Erreur réseau. Vérifiez votre connexion.");
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <form onSubmit={handleSubmit} data-readdy-form="">
        <div className="space-y-4">
          <div>
            <label htmlFor="tmpl_contact_name" className="block text-sm font-medium text-foreground-700 mb-1">
              Nom complet
            </label>
            <input
              type="text"
              id="tmpl_contact_name"
              name="name"
              required
              className="w-full px-4 py-2.5 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              placeholder="Votre nom"
            />
          </div>
          <div>
            <label htmlFor="tmpl_contact_email" className="block text-sm font-medium text-foreground-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="tmpl_contact_email"
              name="email"
              required
              className="w-full px-4 py-2.5 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              placeholder="votre@email.com"
            />
          </div>
          <div>
            <label htmlFor="tmpl_contact_phone" className="block text-sm font-medium text-foreground-700 mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              id="tmpl_contact_phone"
              name="phone"
              className="w-full px-4 py-2.5 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              placeholder="+212 6XX XXX XXX"
            />
          </div>
          <div>
            <label htmlFor="tmpl_contact_subject" className="block text-sm font-medium text-foreground-700 mb-1">
              Sujet
            </label>
            <input
              type="text"
              id="tmpl_contact_subject"
              name="subject"
              required
              className="w-full px-4 py-2.5 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              placeholder="Sujet de votre message"
            />
          </div>
          <div>
            <label htmlFor="tmpl_contact_message" className="block text-sm font-medium text-foreground-700 mb-1">
              Message
            </label>
            <textarea
              id="tmpl_contact_message"
              name="message"
              required
              rows={4}
              maxLength={500}
              className="w-full px-4 py-2.5 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors resize-none"
              placeholder="Votre message (500 caractères max)"
            />
          </div>

          {/* Honeypot */}
          <input
            type="text"
            name="website_alt"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute opacity-0 pointer-events-none"
            style={{ position: 'absolute', left: '-9999px' }}
          />

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {status === 'submitting' ? (
              <span className="flex items-center justify-center gap-2">
                <i className="ri-loader-4-line animate-spin"></i>
                Envoi...
              </span>
            ) : (
              'Envoyer le message'
            )}
          </button>

          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-accent-50 border border-accent-200/70 rounded-lg text-sm text-accent-800">
              <i className="ri-checkbox-circle-line text-lg text-accent-600"></i>
              {message}
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <i className="ri-error-warning-line text-lg text-red-500"></i>
              {message}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}