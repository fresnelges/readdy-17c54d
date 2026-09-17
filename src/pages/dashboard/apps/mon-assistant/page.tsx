import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import ChatMessage from './components/ChatMessage';
import type { Message } from './types';

const WELCOME =
  'Bonjour ! Je suis votre assistant personnel. Je suis connecté à votre boutique (produits, commandes, clients, transactions) et à vos applications installées (projets, tâches, tickets, formulaires, documents, fidélité). Posez-moi vos questions et je vous aiderai à piloter votre activité.';

const SUGGESTIONS = [
  { icon: 'ri-line-chart-line', text: 'Comment se portent mes ventes ?' },
  { icon: 'ri-projector-line', text: 'Combien de projets ai-je et leur état ?' },
  { icon: 'ri-archive-line', text: 'Quels produits dois-je réapprovisionner ?' },
  { icon: 'ri-user-heart-line', text: 'Combien de clients ai-je ?' },
];

export default function MonAssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: WELCOME }]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Charger l'historique dans le fil de conversation (ordre chronologique)
  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error: hError } = await supabase
        .from('monassistantshop')
        .select('id, messageshop, reponseai, date')
        .eq('iduser', user.id)
        .order('date', { ascending: true })
        .limit(200);

      if (hError) throw new Error(hError.message);

      const historyMessages: Message[] = [];
      for (const r of data || []) {
        const q = String(r.messageshop ?? '').trim();
        const a = String(r.reponseai ?? '').trim();
        if (q) historyMessages.push({ role: 'user', content: q });
        if (a) historyMessages.push({ role: 'assistant', content: a });
      }

      setMessages([{ role: 'assistant', content: WELCOME }, ...historyMessages]);
    } catch {
      // on garde le message d'accueil si l'historique ne charge pas
    } finally {
      setHistoryLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    if (user && !historyLoaded) loadHistory();
  }, [user, historyLoaded, loadHistory]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const resetConversation = useCallback(() => {
    setMessages([{ role: 'assistant', content: WELCOME }]);
    setError(null);
    setInput('');
    inputRef.current?.focus();
  }, []);

  const runAssistant = useCallback(
    async (
      body: { message?: string; weeklySummary?: boolean; userId: string },
      userContent: string,
    ) => {
      setMessages((prev) => [...prev, { role: 'user', content: userContent }]);
      setInput('');
      setError(null);
      setLoading(true);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('mon-assistant', { body });

        if (fnError) {
          let msg = fnError.message || "Impossible de contacter l'assistant";
          try {
            const ctx = (fnError as unknown as { context?: Response }).context;
            if (ctx) {
              const resBody = (await ctx.json()) as { error?: string };
              if (resBody?.error) msg = resBody.error;
            }
          } catch {
            /* message générique conservé */
          }
          throw new Error(msg);
        }

        const reply = (data as { reply?: string; error?: string } | null)?.reply;
        if (!reply) {
          const errMsg = (data as { error?: string } | null)?.error;
          if (errMsg) throw new Error(errMsg);
          throw new Error("Réponse vide de l'assistant");
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Une erreur est survenue';
        setError(msg);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Désolé, je n\u2019ai pas pu répondre. Réessayez dans un instant.',
          },
        ]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [],
  );

  const handleSend = useCallback(
    (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || loading || !user) return;
      runAssistant({ message: text, userId: user.id }, text);
    },
    [input, loading, user, runAssistant],
  );

  const handleWeeklySummary = useCallback(() => {
    if (loading || !user) return;
    runAssistant(
      { weeklySummary: true, userId: user.id },
      'Résumé de la semaine : tops + alertes',
    );
  }, [loading, user, runAssistant]);

  const showSuggestions = messages.length <= 1 && !loading;

  return (
    <div className="relative w-full min-w-0 max-w-full flex flex-col h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)] overflow-hidden bg-background-50">
      {/* En-tête compact */}
      <header className="flex items-center gap-2.5 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 border-b border-background-200/70 flex-shrink-0">
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center">
            <i className="ri-robot-2-line text-base"></i>
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent-500 border-2 border-background-50"></span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm sm:text-base font-bold font-heading text-foreground-950 leading-tight truncate">
            Mon Assistant
          </h2>
          {loading ? (
            <p className="text-[11px] text-primary-600 truncate flex items-center gap-1">
              <span>en train d&apos;écrire</span>
              <span className="inline-flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 h-1 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1 h-1 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
            </p>
          ) : (
            <p className="text-[11px] text-foreground-500 truncate">Connecté à votre boutique et vos apps</p>
          )}
        </div>
        <button
          onClick={handleWeeklySummary}
          disabled={loading}
          title="Résumé hebdomadaire (tops + alertes)"
          className="flex items-center justify-center gap-1.5 w-9 sm:w-auto h-9 sm:px-3 rounded-full bg-primary-500 text-background-50 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex-shrink-0 whitespace-nowrap"
        >
          <i className="ri-file-list-3-line text-base"></i>
          <span className="hidden sm:inline text-xs font-medium">Résumé hebdo</span>
        </button>
        <button
          onClick={resetConversation}
          title="Nouvelle conversation"
          className="flex items-center justify-center gap-1.5 w-9 sm:w-auto h-9 sm:px-3 rounded-full bg-background-100 border border-background-200/70 text-foreground-600 hover:text-foreground-900 hover:bg-background-200/60 transition-colors cursor-pointer flex-shrink-0 whitespace-nowrap"
        >
          <i className="ri-add-line text-base"></i>
          <span className="hidden sm:inline text-xs font-medium">Nouvelle</span>
        </button>
      </header>

      {/* Messages — prend tout l'espace disponible */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-5 space-y-4 sm:space-y-5">
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}

          {loading && (
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0">
                <i className="ri-robot-2-line text-sm"></i>
              </div>
              <div className="flex gap-1 px-4 py-3.5 bg-background-100 rounded-2xl rounded-tl-md">
                <span
                  className="w-2 h-2 bg-foreground-300 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></span>
                <span
                  className="w-2 h-2 bg-foreground-300 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></span>
                <span
                  className="w-2 h-2 bg-foreground-300 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></span>
              </div>
            </div>
          )}

          {/* Suggestions — desktop uniquement */}
          {showSuggestions && (
            <div className="hidden sm:flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleSend(s.text)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-background-50 border border-background-200/70 rounded-full text-xs text-foreground-600 cursor-pointer hover:bg-background-100 hover:border-primary-300 transition-colors whitespace-nowrap"
                >
                  <i className={`${s.icon} text-xs text-primary-500`}></i>
                  {s.text}
                </button>
              ))}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="px-3 sm:px-4 md:px-6 pb-2 flex-shrink-0">
          <div className="w-full max-w-3xl mx-auto flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            <i className="ri-error-warning-line mt-0.5 flex-shrink-0"></i>
            <span className="flex-1 min-w-0 break-words">{error}</span>
            <button
              onClick={() => setError(null)}
              title="Fermer"
              className="text-red-500 cursor-pointer flex-shrink-0"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        </div>
      )}

      {/* Zone basse : saisie épurée */}
      <div className="flex-shrink-0 border-t border-background-200/70 bg-background-50">
        <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3.5">
          <div className="flex items-end gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Posez votre question…"
              className="flex-1 min-w-0 px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-full text-sm focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 text-foreground-900 placeholder:text-foreground-400"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              title="Envoyer"
              className="w-11 h-11 rounded-full bg-primary-500 text-background-50 flex items-center justify-center cursor-pointer hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <i className="ri-send-plane-fill"></i>
            </button>
          </div>
          <p className="hidden sm:block text-[11px] text-foreground-400 mt-1.5 text-center">
            L&apos;assistant analyse les données réelles de votre boutique.
          </p>
        </div>
      </div>
    </div>
  );
}