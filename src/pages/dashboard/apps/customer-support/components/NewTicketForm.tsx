import { useState, type FormEvent } from 'react';

interface NewTicketFormProps {
  onSubmit: (data: { name: string; email: string; subject: string; message: string }) => Promise<void>;
  onCancel: () => void;
}

export default function NewTicketForm({ onSubmit, onCancel }: NewTicketFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-background-50 border border-background-200/70 rounded-lg p-5 mb-6">
      <h3 className="text-sm font-semibold text-foreground-800 mb-4 flex items-center gap-2">
        <i className="ri-add-circle-line text-primary-500"></i>
        Nouveau ticket
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">Nom du client</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom complet"
            className="w-full px-4 py-2.5 text-sm bg-background-50 border border-background-200/70 rounded-lg text-foreground-900 focus:outline-none focus:border-primary-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">Email du client</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@email.com"
            className="w-full px-4 py-2.5 text-sm bg-background-50 border border-background-200/70 rounded-lg text-foreground-900 focus:outline-none focus:border-primary-300"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-foreground-600 mb-1">Sujet</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Objet du ticket"
            className="w-full px-4 py-2.5 text-sm bg-background-50 border border-background-200/70 rounded-lg text-foreground-900 focus:outline-none focus:border-primary-300"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-foreground-600 mb-1">Message initial</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Décrivez la demande du client…"
            className="w-full px-4 py-2.5 text-sm bg-background-50 border border-background-200/70 rounded-lg text-foreground-900 focus:outline-none focus:border-primary-300 resize-none"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <button
          type="submit"
          disabled={submitting || !name.trim() || !subject.trim() || !message.trim()}
          className="px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {submitting ? 'Création…' : 'Créer le ticket'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm font-medium text-foreground-600 hover:text-foreground-800 cursor-pointer transition-colors whitespace-nowrap"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}