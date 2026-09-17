import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import type { SupportTicket, TicketMessage } from '../types';

interface ConversationProps {
  ticket: SupportTicket;
  messages: TicketMessage[];
  supportName: string;
  onReply: (text: string) => Promise<void>;
  onToggleStatus: () => void;
}

function fullDate(d: string) {
  return new Date(d).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Conversation({ ticket, messages, supportName, onReply, onToggleStatus }: ConversationProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isOpen = ticket.status === 'open';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const submit = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await onReply(value);
      setText('');
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-background-200/70">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
            <span className="text-base font-semibold text-accent-700">
              {(ticket.customer_name || '?').trim().charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground-900 truncate">{ticket.customer_name || 'Client'}</p>
            <p className="text-xs text-foreground-500 truncate">{ticket.customer_email || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
              isOpen ? 'bg-accent-50 text-accent-700' : 'bg-background-100 text-foreground-500'
            }`}
          >
            {isOpen ? 'Ouvert' : 'Fermé'}
          </span>
          <button
            onClick={onToggleStatus}
            title={isOpen ? 'Fermer le ticket' : 'Réouvrir le ticket'}
            className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
              isOpen
                ? 'bg-background-100 text-foreground-500 hover:bg-red-50 hover:text-red-600'
                : 'bg-accent-50 text-accent-600 hover:bg-accent-100'
            }`}
          >
            <i className={`ri-${isOpen ? 'close' : 'refresh'}-line`}></i>
          </button>
        </div>
      </div>

      {/* Subject */}
      <div className="px-4 py-3 bg-background-50 border-b border-background-200/70">
        <p className="text-sm font-semibold text-foreground-900">{ticket.subject}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-background-50/50" style={{ minHeight: '320px' }}>
        {messages.length === 0 ? (
          <p className="text-center text-sm text-foreground-400 py-10">Aucun message dans cette conversation.</p>
        ) : (
          messages.map((m) => {
            const isSupport = m.sender_type === 'support';
            return (
              <div key={m.id} className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isSupport ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isSupport
                        ? 'bg-primary-500 text-background-50 rounded-br-sm'
                        : 'bg-background-100 text-foreground-800 rounded-bl-sm border border-background-200/70'
                    }`}
                  >
                    {m.message}
                  </div>
                  <span className="text-[11px] text-foreground-400 mt-1 px-1">
                    {isSupport ? (supportName || 'Support') : m.sender_name || 'Client'} · {fullDate(m.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef}></div>
      </div>

      {/* Reply box */}
      <div className="px-4 py-3 border-t border-background-200/70 bg-background-50">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            maxLength={1000}
            disabled={!isOpen}
            placeholder={isOpen ? 'Répondre au client… (Entrée pour envoyer)' : 'Ce ticket est fermé. Réouvrez-le pour répondre.'}
            className="flex-1 px-4 py-2.5 text-sm bg-background-50 border border-background-200/70 rounded-lg text-foreground-900 focus:outline-none focus:border-primary-300 resize-none disabled:opacity-50"
          />
          <button
            onClick={submit}
            disabled={sending || !text.trim() || !isOpen}
            className="h-10 px-4 bg-primary-500 text-background-50 rounded-lg text-sm font-medium cursor-pointer hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            {sending ? (
              <i className="ri-loader-4-line animate-spin"></i>
            ) : (
              <i className="ri-send-plane-2-line"></i>
            )}
            <span className="hidden sm:inline">Envoyer</span>
          </button>
        </div>
      </div>
    </div>
  );
}