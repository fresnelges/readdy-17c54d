import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { SupportTicket, TicketMessage } from './types';
import TicketList from './components/TicketList';
import Conversation from './components/Conversation';
import NewTicketForm from './components/NewTicketForm';

type Filter = 'all' | 'open' | 'closed';

export default function CustomerSupportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<Record<number, TicketMessage[]>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: ticketsData, error: tErr } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('idcommerce', user.id)
        .order('updated_at', { ascending: false });
      if (tErr) throw tErr;
      const list = (ticketsData || []) as SupportTicket[];
      setTickets(list);

      const ids = list.map((t) => t.id);
      const grouped: Record<number, TicketMessage[]> = {};
      if (ids.length > 0) {
        const { data: msgData, error: mErr } = await supabase
          .from('support_ticket_messages')
          .select('*')
          .in('ticket_id', ids)
          .order('created_at', { ascending: true });
        if (mErr) throw mErr;
        (msgData || []).forEach((m) => {
          const msg = m as TicketMessage;
          if (!grouped[msg.ticket_id]) grouped[msg.ticket_id] = [];
          grouped[msg.ticket_id].push(msg);
        });
      }
      setMessages(grouped);
      setSelectedId((prev) => {
        if (prev && list.some((t) => t.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des tickets.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Mise à jour en temps réel (optionnelle, silencieuse si indisponible)
  useEffect(() => {
    if (!user) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel('support-tickets')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket_messages' }, () => {
          fetchData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
          fetchData();
        })
        .subscribe();
    } catch {
      /* le temps réel est optionnel */
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  const handleReply = async (text: string) => {
    if (!selectedId || !user) return;
    const { error: err } = await supabase.from('support_ticket_messages').insert({
      ticket_id: selectedId,
      sender_type: 'support',
      sender_name: user.name || user.nomcommerce || 'Support',
      message: text.trim(),
    });
    if (err) {
      setError(err.message);
      return;
    }
    await supabase.from('support_tickets').update({ updated_at: new Date().toISOString() }).eq('id', selectedId);
    await fetchData();
  };

  const handleToggleStatus = async (ticket: SupportTicket) => {
    const newStatus = ticket.status === 'open' ? 'closed' : 'open';
    const { error: err } = await supabase.from('support_tickets').update({ status: newStatus }).eq('id', ticket.id);
    if (err) setError(err.message);
    else await fetchData();
  };

  const handleCreate = async (data: { name: string; email: string; subject: string; message: string }) => {
    if (!user) return;
    const { data: newTicket, error: err } = await supabase
      .from('support_tickets')
      .insert({
        idcommerce: user.id,
        customer_name: data.name,
        customer_email: data.email,
        subject: data.subject,
        status: 'open',
      })
      .select('id')
      .single();
    if (err || !newTicket) {
      setError(err?.message || 'Erreur lors de la création du ticket.');
      return;
    }
    const ticketId = newTicket.id as number;
    await supabase.from('support_ticket_messages').insert({
      ticket_id: ticketId,
      sender_type: 'customer',
      sender_name: data.name,
      message: data.message,
    });
    setShowForm(false);
    await fetchData();
    setSelectedId(ticketId);
  };

  const filtered = tickets.filter((t) => (filter === 'all' ? true : t.status === filter));
  const selected = tickets.find((t) => t.id === selectedId) || null;
  const selectedMessages = selected ? messages[selected.id] || [] : [];
  const openCount = tickets.filter((t) => t.status === 'open').length;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
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
          <p className="text-sm text-foreground-500 mt-1">
            {openCount > 0 ? `${openCount} ticket${openCount > 1 ? 's' : ''} ouvert${openCount > 1 ? 's' : ''}` : 'Aucun ticket ouvert'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            title="Actualiser"
            className="w-10 h-10 rounded-full bg-background-50 border border-background-200/70 flex items-center justify-center text-foreground-500 hover:text-foreground-800 cursor-pointer transition-colors"
          >
            <i className="ri-refresh-line"></i>
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 transition-colors"
          >
            <i className={`ri-${showForm ? 'close' : 'add'}-line`}></i>
            {showForm ? 'Fermer' : 'Nouveau ticket'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <i className="ri-error-warning-line"></i>
          <span className="flex-1">{error}</span>
          <button onClick={fetchData} className="text-red-600 underline cursor-pointer whitespace-nowrap">
            Réessayer
          </button>
        </div>
      )}

      {showForm && <NewTicketForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(['all', 'open', 'closed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              filter === f
                ? 'bg-primary-50 text-primary-700'
                : 'bg-background-50 border border-background-200/70 text-foreground-600'
            }`}
          >
            {f === 'all' ? 'Tous' : f === 'open' ? 'Ouverts' : 'Fermés'}
          </button>
        ))}
        <span className="text-xs text-foreground-400 ml-auto">{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-4 items-start">
          {/* Liste des tickets */}
          <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-background-200/70 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground-800">Tickets</span>
              <i className="ri-list-unordered text-foreground-400"></i>
            </div>
            <TicketList
              tickets={filtered}
              selectedId={selectedId}
              messages={messages}
              onSelect={(id) => setSelectedId(id)}
            />
          </div>

          {/* Conversation */}
          <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
            {selected ? (
              <Conversation
                ticket={selected}
                messages={selectedMessages}
                supportName={user?.name || user?.nomcommerce || 'Support'}
                onReply={handleReply}
                onToggleStatus={() => handleToggleStatus(selected)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mb-3">
                  <i className="ri-message-3-line text-2xl text-foreground-300"></i>
                </div>
                <p className="text-sm text-foreground-500">
                  {tickets.length === 0
                    ? 'Créez un ticket pour démarrer une conversation.'
                    : 'Sélectionnez un ticket pour voir la conversation.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}