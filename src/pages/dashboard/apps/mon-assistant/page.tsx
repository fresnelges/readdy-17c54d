import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function MonAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Bonjour ! Je suis votre assistant IA. Je peux vous aider à analyser vos ventes, gérer vos stocks, ou répondre à vos questions sur votre commerce. Que voulez-vous savoir ?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const suggestions = [
    'Quelles sont mes ventes du jour ?',
    'Quels produits sont en rupture de stock ?',
    'Analyse mes performances cette semaine',
    'Donne-moi des conseils pour augmenter mes ventes',
  ];

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    await new Promise((r) => setTimeout(r, 1500));
    const responses: Record<string, string> = {
      'ventes': 'D après l analyse de vos données récentes, vos ventes sont stables avec une légère tendance à la hausse. Le panier moyen est satisfaisant. Je vous recommande de mettre en avant vos produits les plus populaires.',
      'stock': 'Vérification des stocks en cours... Certains produits approchent du seuil critique. Je vous conseille de réapprovisionner rapidement les articles les plus vendus pour éviter les ruptures.',
      'performance': 'Vos performances cette semaine montrent une croissance par rapport à la semaine dernière. Le taux de conversion est en hausse. Continuez à optimiser vos fiches produits !',
      'conseils': 'Pour augmenter vos ventes, je vous suggère : 1) Créez des offres groupées 2) Envoyez des emails de relance panier abandonné 3) Ajoutez des avis clients sur vos produits 4) Proposez la livraison gratuite à partir d un certain montant.',
    };

    let reply = 'Je comprends votre question. Laissez-moi analyser vos données pour vous donner une réponse précise.';
    for (const [key, value] of Object.entries(responses)) {
      if (input.toLowerCase().includes(key)) { reply = value; break; }
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
          <i className="ri-robot-2-line mr-2 text-primary-500"></i>
          Mon Assistant
        </h2>
        <p className="text-sm text-foreground-500 mt-1">Chat IA qui analyse vos données pour vous assister</p>
      </div>

      <div className="bg-background-50 border border-background-200/70 rounded-lg flex flex-col h-[500px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'assistant' ? 'bg-primary-50 text-primary-600' : 'bg-accent-50 text-accent-600'
              }`}>
                <i className={`ri-${msg.role === 'assistant' ? 'robot-2' : 'user'}-line text-sm`}></i>
              </div>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-lg text-sm ${
                msg.role === 'assistant' ? 'bg-background-100 text-foreground-800' : 'bg-primary-50 text-foreground-800'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                <i className="ri-robot-2-line text-sm text-primary-600"></i>
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
          <div className="px-4 py-2 flex gap-2 overflow-x-auto flex-shrink-0">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => { setInput(s); }}
                className="px-3 py-1.5 bg-background-100 border border-background-200/70 rounded-full text-xs text-foreground-600 whitespace-nowrap cursor-pointer hover:bg-background-200/70 flex-shrink-0"
              >
                {s}
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
              placeholder="Posez votre question..."
              className="flex-1 px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-full text-sm focus:outline-none focus:border-primary-300"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-full bg-primary-500 text-background-50 flex items-center justify-center cursor-pointer hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              <i className="ri-send-plane-fill"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}