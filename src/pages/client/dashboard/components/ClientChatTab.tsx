import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useBrand } from '@/hooks/useBrand';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  results?: SearchResult[];
}

interface SearchResult {
  type: string;
  id: number;
  name: string;
  description?: string;
  price?: number;
  discount_price?: number;
  discount_enabled?: boolean;
  duration?: number;
  location?: string;
  image?: string;
  media?: string;
  category?: string;
  ville?: string;
  pays?: string;
  boutique?: {
    id: number;
    name: string;
    user_name: string;
    telephone?: string;
    ville?: string;
    pays?: string;
    image?: string;
    url: string;
  } | null;
}

const SUGGESTIONS = [
  { icon: 'ri-calendar-check-line', text: 'Je veux une réservation pour un coiffeur à Fès' },
  { icon: 'ri-store-2-line', text: 'Quels sont les restaurants disponibles ?' },
  { icon: 'ri-service-line', text: 'Je cherche un service de beauté' },
  { icon: 'ri-shopping-bag-3-line', text: 'Quels produits sont disponibles ?' },
  { icon: 'ri-building-line', text: 'Montre-moi les boutiques sur la plateforme' },
];

export default function ClientChatTab() {
  const { user } = useAuth();
  const { brand } = useBrand();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Bonjour ! 👋 Je suis votre assistant. Je suis connecté à toute la plateforme : services, réservations, boutiques, produits... Dites-moi ce que vous cherchez et je trouverai ce qu'il vous faut !`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading || !user) return;
    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('zifek-client-chat', {
        body: { message: userMsg.content, userId: user.id },
      });

      if (error) throw error;

      const reply = data?.reply || "Désolé, je n'ai pas pu analyser votre demande.";
      const results = data?.results || [];

      setMessages((prev) => [...prev, { role: 'assistant', content: reply, results }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: '❌ Désolé, une erreur est survenue. Veuillez réessayer.',
      }]);
    }
    setLoading(false);
  }, [input, loading, user]);

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
          <i className="ri-robot-2-line mr-2 text-accent-500"></i>
          Assistant IA {brand.name}
        </h2>
        <p className="text-sm text-foreground-500 mt-1">
          Connecté à toute la base de données {brand.name} — services, réservations, boutiques, produits...
        </p>
      </div>

      {/* Chat container */}
      <div className="bg-background-50 border border-background-200/70 rounded-xl flex flex-col h-[550px] overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i}>
              <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'assistant' ? 'bg-accent-100 text-accent-600' : 'bg-background-200/60 text-foreground-500'
                }`}>
                  <i className={`ri-${msg.role === 'assistant' ? 'robot-2' : 'user'}-line text-sm`}></i>
                </div>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-lg text-sm ${
                  msg.role === 'assistant'
                    ? 'bg-background-100 text-foreground-800'
                    : 'bg-accent-100/70 text-foreground-800'
                }`}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                </div>
              </div>

              {/* Search results cards */}
              {msg.results && msg.results.length > 0 && (
                <div className="mt-3 ml-11 space-y-2">
                  {msg.results.map((result, ri) => (
                    <a
                      key={`${result.type}-${result.id}-${ri}`}
                      href={result.boutique?.url || '#'}
                      target={result.boutique ? '_blank' : undefined}
                      rel={result.boutique ? 'noopener noreferrer' : undefined}
                      className={`block bg-background-50 border border-background-200/70 rounded-lg p-3 hover:border-accent-200/50 transition-colors ${
                        result.boutique ? 'cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Image */}
                        <div className="w-14 h-14 rounded-lg bg-background-100 flex-shrink-0 overflow-hidden">
                          {(result.image || (result.media && typeof result.media === 'string')) ? (
                            <img
                              src={result.image || (typeof result.media === 'string' ? result.media : '')}
                              alt={result.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <i className={`text-foreground-300 ${
                                result.type === 'produit' ? 'ri-shopping-bag-3-line' :
                                result.type === 'service_réservation' ? 'ri-calendar-check-line' :
                                'ri-service-line'
                              } text-lg`}></i>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-foreground-800 truncate">{result.name}</p>
                              {result.description && (
                                <p className="text-xs text-foreground-500 mt-0.5 line-clamp-2">{result.description}</p>
                              )}
                            </div>
                            {result.price && (
                              <span className="text-sm font-bold text-accent-600 whitespace-nowrap">
                                {result.discount_enabled && result.discount_price
                                  ? `${result.discount_price} MAD`
                                  : `${result.price} MAD`
                                }
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {result.type === 'service_réservation' && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-accent-600 bg-accent-50 px-1.5 py-0.5 rounded">
                                <i className="ri-calendar-check-line text-xs"></i>
                                Réservation
                              </span>
                            )}
                            {result.duration && (
                              <span className="text-[10px] text-foreground-500">{result.duration} min</span>
                            )}
                            {(result.ville || result.location) && (
                              <span className="text-[10px] text-foreground-500 flex items-center gap-0.5">
                                <i className="ri-map-pin-line text-xs"></i>
                                {result.ville || result.location}
                              </span>
                            )}
                            {result.category && (
                              <span className="text-[10px] text-foreground-500 bg-background-100 px-1.5 py-0.5 rounded">
                                {result.category}
                              </span>
                            )}
                          </div>

                          {result.boutique && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-background-200/50">
                              <div className="w-5 h-5 rounded-full bg-accent-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {result.boutique.image ? (
                                  <img src={result.boutique.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[8px] text-accent-600 font-bold">
                                    {result.boutique.name?.charAt(0)?.toUpperCase() || '?'}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-foreground-600 font-medium truncate">
                                {result.boutique.name}
                              </span>
                              <span className="text-[10px] text-accent-500">
                                {result.boutique.url}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center">
                <i className="ri-robot-2-line text-sm text-accent-600"></i>
              </div>
              <div className="flex gap-1 px-4 py-2.5">
                <span className="w-2 h-2 bg-foreground-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-foreground-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-foreground-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-4 py-2 flex gap-2 overflow-x-auto flex-shrink-0 border-t border-background-200/70">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.text}
                onClick={() => handleSuggestion(s.text)}
                className="flex items-center gap-1.5 px-3 py-2 bg-background-50 border border-background-200/70 rounded-full text-xs text-foreground-600 whitespace-nowrap cursor-pointer hover:bg-background-100 hover:border-accent-200/50 transition-colors flex-shrink-0"
              >
                <i className={`${s.icon} text-xs text-accent-500`}></i>
                {s.text}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-background-200/70 flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ex: Je veux une réservation pour un coiffeur à Fès..."
              className="flex-1 px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-full text-sm focus:outline-none focus:border-accent-300"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-full bg-accent-500 text-background-50 dark:text-foreground-950 flex items-center justify-center cursor-pointer hover:bg-accent-600 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              <i className="ri-send-plane-fill"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}