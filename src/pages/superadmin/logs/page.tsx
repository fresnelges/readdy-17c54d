import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface ApiLog {
  id: number;
  provider: string;
  model: string;
  endpoint: string;
  request_tokens: number;
  response_tokens: number;
  duration_ms: number;
  status: string;
  error_message: string | null;
  user_id: number;
  created_at: string;
}

type ProviderFilter = string;

const PROVIDER_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  openai: { label: 'OpenAI', icon: 'ri-openai-line', color: 'bg-accent-100 text-accent-700' },
  xai: { label: 'xAI Grok', icon: 'ri-brain-line', color: 'bg-foreground-100 text-foreground-700' },
  openrouter: { label: 'OpenRouter', icon: 'ri-router-line', color: 'bg-primary-100 text-primary-700' },
  ollama: { label: 'Ollama', icon: 'ri-computer-line', color: 'bg-secondary-100 text-secondary-700' },
};

export default function SuperAdminLogsPage() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('zifek_api_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (providerFilter !== 'all') {
        query = query.eq('provider', providerFilter);
      }

      const { data } = await query;
      setLogs((data as ApiLog[]) || []);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [providerFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Compute stats
  const totalCalls = logs.length;
  const successCalls = logs.filter((l) => l.status === 'success').length;
  const errorCalls = logs.filter((l) => l.status === 'error').length;
  const totalTokens = logs.reduce((s, l) => s + l.request_tokens + l.response_tokens, 0);
  const avgDuration = totalCalls > 0 ? Math.round(logs.reduce((s, l) => s + l.duration_ms, 0) / totalCalls) : 0;

  const totalPages = Math.ceil(logs.length / perPage);
  const paginatedLogs = logs.slice((page - 1) * perPage, page * perPage);

  const formatDuration = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
  };

  const formatTokens = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Logs Système — API IA</h2>
        <p className="text-sm text-foreground-500 mt-1">
          Surveillance des appels aux APIs d&apos;intelligence artificielle
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { icon: 'ri-phone-line', label: 'Appels', value: totalCalls, sub: `${successCalls} réussis / ${errorCalls} erreurs`, color: 'bg-primary-100 text-primary-700' },
          { icon: 'ri-time-line', label: 'Durée moyenne', value: formatDuration(avgDuration), sub: 'Par appel API', color: 'bg-accent-100 text-accent-700' },
          { icon: 'ri-text-spacing', label: 'Tokens', value: formatTokens(totalTokens), sub: 'Consommés au total', color: 'bg-secondary-100 text-secondary-700' },
          { icon: 'ri-check-double-line', label: 'Taux succès', value: `${totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) : 0}%`, sub: `${successCalls}/${totalCalls} appels OK`, color: 'bg-foreground-100 text-foreground-700' },
        ].map((stat, i) => (
          <div key={i} className="bg-background-50 border border-background-200/70 rounded-lg p-4">
            <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
              <i className={`${stat.icon} text-sm`}></i>
            </div>
            <div className="text-xl font-bold font-heading text-foreground-950">{stat.value}</div>
            <div className="text-xs text-foreground-500">{stat.label}</div>
            <div className="text-[11px] text-foreground-400 mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Provider Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {[
          { key: 'all', label: 'Tous les providers' },
          { key: 'openai', label: 'OpenAI' },
          { key: 'xai', label: 'xAI Grok' },
          { key: 'openrouter', label: 'OpenRouter' },
          { key: 'ollama', label: 'Ollama' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => { setProviderFilter(f.key); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              providerFilter === f.key
                ? 'bg-foreground-950 text-background-50'
                : 'bg-background-50 border border-background-200/70 text-foreground-600 hover:bg-background-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Logs Table */}
      {paginatedLogs.length === 0 ? (
        <div className="text-center py-16">
          <i className="ri-terminal-line text-4xl text-foreground-300 mb-3 block"></i>
          <p className="text-foreground-500 text-sm">Aucun log trouvé</p>
        </div>
      ) : (
        <>
          <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-background-200/70 bg-background-100/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-500">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-500">Provider</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-500 hidden md:table-cell">Modèle</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-500 hidden lg:table-cell">Endpoint</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-foreground-500 hidden sm:table-cell">Tokens</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-foreground-500 hidden sm:table-cell">Durée</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-foreground-500">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log) => {
                    const cfg = PROVIDER_CONFIG[log.provider] || { label: log.provider, icon: 'ri-server-line', color: 'bg-background-100 text-foreground-500' };
                    return (
                      <tr key={log.id} className="border-b border-background-200/70 last:border-0 hover:bg-background-100/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-xs text-foreground-600 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </div>
                          <div className="text-[11px] text-foreground-400 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-md ${cfg.color} flex items-center justify-center`}>
                              <i className={`${cfg.icon} text-xs`}></i>
                            </span>
                            <span className="text-xs font-medium text-foreground-800 whitespace-nowrap">{cfg.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground-600 font-mono hidden md:table-cell whitespace-nowrap">{log.model || '-'}</td>
                        <td className="px-4 py-3 text-xs text-foreground-500 font-mono hidden lg:table-cell truncate max-w-[160px]">{log.endpoint || '-'}</td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <span className="text-xs text-foreground-600">{formatTokens(log.request_tokens + log.response_tokens)}</span>
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <span className="text-xs text-foreground-500">{formatDuration(log.duration_ms)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                            log.status === 'success' ? 'bg-accent-50 text-accent-600' : 'bg-foreground-100 text-red-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-accent-500' : 'bg-red-400'}`}></span>
                            {log.status === 'success' ? 'OK' : 'Erreur'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-foreground-400">Page {page} sur {totalPages}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="w-8 h-8 flex items-center justify-center rounded-md border border-background-200/70 text-xs text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  <i className="ri-arrow-left-s-line"></i>
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (page <= 3) pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = page - 2 + i;
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-medium transition-colors cursor-pointer ${page === pageNum ? 'bg-foreground-950 text-background-50' : 'border border-background-200/70 text-foreground-600 hover:bg-background-100'}`}>
                      {pageNum}
                    </button>
                  );
                })}
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md border border-background-200/70 text-xs text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  <i className="ri-arrow-right-s-line"></i>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}