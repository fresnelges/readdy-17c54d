import type { SupportTicket, TicketMessage } from '../types';

interface TicketListProps {
  tickets: SupportTicket[];
  selectedId: number | null;
  messages: Record<number, TicketMessage[]>;
  onSelect: (id: number) => void;
}

function shortDate(d: string) {
  const date = new Date(d);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function TicketList({ tickets, selectedId, messages, onSelect }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mb-3">
          <i className="ri-inbox-line text-2xl text-foreground-300"></i>
        </div>
        <p className="text-sm text-foreground-500">Aucun ticket pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-background-200/70">
      {tickets.map((ticket) => {
        const thread = messages[ticket.id] || [];
        const last = thread[thread.length - 1];
        const isSelected = ticket.id === selectedId;
        const isOpen = ticket.status === 'open';
        const initial = (ticket.customer_name || '?').trim().charAt(0).toUpperCase();

        return (
          <button
            key={ticket.id}
            onClick={() => onSelect(ticket.id)}
            className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
              isSelected ? 'bg-primary-50' : 'hover:bg-background-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${
                  isOpen ? 'bg-accent-100 text-accent-700' : 'bg-background-100 text-foreground-500'
                }`}
              >
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground-900 truncate">{ticket.customer_name || 'Client'}</p>
                  <span className="text-xs text-foreground-400 whitespace-nowrap">{shortDate(ticket.updated_at)}</span>
                </div>
                <p className="text-sm text-foreground-700 truncate mt-0.5">{ticket.subject}</p>
                <p className="text-xs text-foreground-400 truncate mt-0.5">
                  {last ? `${last.sender_type === 'support' ? 'Vous' : last.sender_name || 'Client'} : ${last.message}` : 'Aucun message'}
                </p>
              </div>
              {isOpen && (
                <span className="w-2 h-2 rounded-full bg-accent-500 flex-shrink-0 mt-1.5"></span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}