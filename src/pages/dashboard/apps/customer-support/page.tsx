import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface SupportTicket {
  id: number;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export default function CustomerSupportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

  useEffect(() => {
    const saved = localStorage.getItem('support_tickets');
    if (saved) {
      try { setTickets(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const saveTickets = (newTickets: SupportTicket[]) => {
    setTickets(newTickets);
    localStorage.setItem('support_tickets', JSON.stringify(newTickets));
  };

  const handleSubmit = async () => {
    if (!subject || !message) return;
    setSubmitting(true);
    const newTicket: SupportTicket = {
      id: Date.now(),
      subject,
      message,
      status: 'open',
      created_at: new Date().toISOString(),
    };
    saveTickets([newTicket, ...tickets]);
    setSubject('');
    setMessage('');
    setShowForm(false);
    setSubmitting(false);
  };

  const handleToggleStatus = (ticketId: number) => {
    saveTickets(tickets.map((t) =>
      t.id === ticketId ? { ...t, status: t.status === 'open' ? 'closed' : 'open' } : t
    ));
  };

  const filtered = tickets.filter((t) => {
    if (filter === 'open') return t.status === 'open';
    if (filter === 'closed') return t.status === 'closed';
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-foreground-500 hover:text-foreground-800 cursor-pointer transition-colors mb-2"
          >
            <i className="ri-arrow-left-line"></i>
            Retour
          </button>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            <i className="ri-customer-service-2-line mr-2 text-primary-500"></i>
            Service Client & Support
          </h2>
          <p className="text-sm text-foreground-500 mt-1">Gérez les tickets de support client</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 transition-colors"
        >
          <i className={`ri-${showForm ? 'close' : 'add'}-line`}></i>
          {showForm ? 'Fermer' : 'Nouveau ticket'}
        </button>
      </div>

      {showForm && (
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 mb-6">
          <h3 className="text-sm font-semibold text-foreground-800 mb-4">Créer un ticket</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">Sujet</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Titre du ticket"
                className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Décrivez votre problème..."
                className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 resize-none"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !subject || !message}
              className="px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Création...' : 'Créer le ticket'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        {(['all', 'open', 'closed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              filter === f ? 'bg-primary-50 text-primary-700' : 'bg-background-50 border border-background-200/70 text-foreground-600'
            }`}
          >
            {f === 'all' ? 'Tous' : f === 'open' ? 'Ouverts' : 'Fermés'}
          </button>
        ))}
        <span className="text-xs text-foreground-400 ml-auto">{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mb-3">
            <i className="ri-customer-service-2-line text-2xl text-foreground-300"></i>
          </div>
          <p className="text-foreground-500">Aucun ticket {filter !== 'all' ? filter : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <div key={ticket.id} className="bg-background-50 border border-background-200/70 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground-900">{ticket.subject}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      ticket.status === 'open' ? 'bg-accent-50 text-accent-700' : 'bg-background-100 text-foreground-500'
                    }`}>
                      {ticket.status === 'open' ? 'Ouvert' : 'Fermé'}
                    </span>
                  </div>
                  <p className="text-sm text-foreground-600 line-clamp-3">{ticket.message}</p>
                  <p className="text-xs text-foreground-400 mt-2">
                    {new Date(ticket.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => handleToggleStatus(ticket.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${
                    ticket.status === 'open'
                      ? 'bg-background-100 text-foreground-400 hover:bg-red-50 hover:text-red-500'
                      : 'bg-accent-50 text-accent-600 hover:bg-accent-100'
                  }`}
                  title={ticket.status === 'open' ? 'Fermer' : 'Réouvrir'}
                >
                  <i className={`ri-${ticket.status === 'open' ? 'close' : 'refresh'}-line`}></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}