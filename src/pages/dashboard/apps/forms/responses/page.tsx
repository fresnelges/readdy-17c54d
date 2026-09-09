import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface FormInfo {
  id: number;
  title: string;
  description: string;
}

interface FieldInfo {
  id: number;
  label: string;
  type: string;
  options: string;
}

interface ResponseRow {
  id: number;
  form_id: number;
  field_id: number;
  response_text: string;
  codeunique: string;
  created_at: string;
}

interface Submission {
  codeunique: string;
  created_at: string;
  startIndex: number;
  responses: { label: string; value: string; type: string }[];
}

interface DailyCount {
  date: string;
  count: number;
  label: string;
}

const ITEMS_PER_PAGE = 20;

export default function FormResponsesPage() {
  const navigate = useNavigate();
  const { id: formIdParam } = useParams<{ id: string }>();
  const formId = formIdParam ? parseInt(formIdParam, 10) : null;

  const [form, setForm] = useState<FormInfo | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [exported, setExported] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = useCallback(async () => {
    if (!formId) return;
    setLoading(true);
    setError(null);

    try {
      const { data: formData, error: formErr } = await supabase
        .from('forms')
        .select('id, title, description')
        .eq('id', formId)
        .maybeSingle();

      if (formErr) throw formErr;
      if (!formData) {
        setError('Formulaire introuvable.');
        setLoading(false);
        return;
      }
      setForm(formData as FormInfo);

      const { data: fieldsData, error: fieldsErr } = await supabase
        .from('form_fields')
        .select('id, label, type, options')
        .eq('form_id', formId)
        .order('position', { ascending: true });

      if (fieldsErr) throw fieldsErr;
      const fields = (fieldsData || []) as FieldInfo[];

      const { data: responsesData, error: respErr } = await supabase
        .from('form_responses')
        .select('id, form_id, field_id, response_text, codeunique, created_at')
        .eq('form_id', formId)
        .order('created_at', { ascending: false });

      if (respErr) throw respErr;
      const responses = (responsesData || []) as ResponseRow[];

      const grouped: Record<string, { created_at: string; items: ResponseRow[] }> = {};
      for (const r of responses) {
        if (!grouped[r.codeunique]) {
          grouped[r.codeunique] = { created_at: r.created_at, items: [] };
        }
        grouped[r.codeunique].items.push(r);
      }

      const submissionsList: Submission[] = Object.entries(grouped).map(([code, data]) => {
        const respList = data.items.map((item) => {
          const field = fields.find((f) => f.id === item.field_id);
          return {
            label: field?.label || 'Champ inconnu',
            value: item.response_text || '—',
            type: field?.type || 'text',
          };
        });
        return {
          codeunique: code,
          created_at: data.created_at,
          startIndex: 0,
          responses: respList,
        };
      });

      submissionsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      submissionsList.forEach((s, i) => { s.startIndex = i + 1; });
      setSubmissions(submissionsList);
      setCurrentPage(1);
      setExpandedSubmissions(new Set());
    } catch {
      setError('Erreur lors du chargement des réponses.');
    }
    setLoading(false);
  }, [formId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeleteSubmission = async (codeunique: string) => {
    setDeleting(codeunique);
    try {
      await supabase.from('form_responses').delete().eq('codeunique', codeunique);
      setSubmissions((prev) => prev.filter((s) => s.codeunique !== codeunique));
      setExpandedSubmissions((prev) => {
        const next = new Set(prev);
        next.delete(codeunique);
        return next;
      });
    } catch {
      setError('Erreur lors de la suppression.');
    }
    setDeleting(null);
  };

  // ---- EXPAND / COLLAPSE ----
  const toggleExpand = (codeunique: string) => {
    setExpandedSubmissions((prev) => {
      const next = new Set(prev);
      if (next.has(codeunique)) {
        next.delete(codeunique);
      } else {
        next.add(codeunique);
      }
      return next;
    });
  };

  // ---- DATE FILTER HELPER ----
  const filterByDate = (items: Submission[]) => {
    let result = items;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((s) => new Date(s.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((s) => new Date(s.created_at) <= to);
    }
    return result;
  };

  // ---- FILTER ----
  const filteredSubmissions = useMemo(() => {
    let result = submissions;

    // Date filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((s) => new Date(s.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((s) => new Date(s.created_at) <= to);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) =>
        s.responses.some((r) => r.value.toLowerCase().includes(q)) ||
        s.codeunique.toLowerCase().includes(q) ||
        new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase().includes(q)
      );
    }

    return result.map((s, i) => ({ ...s, startIndex: i + 1 }));
  }, [submissions, searchQuery, dateFrom, dateTo]);

  const expandAll = () => {
    setExpandedSubmissions(new Set(filteredSubmissions.map((s) => s.codeunique)));
  };

  const collapseAll = () => {
    setExpandedSubmissions(new Set());
  };

  const allExpanded = filteredSubmissions.length > 0 && expandedSubmissions.size === filteredSubmissions.length;

  // ---- PAGINATION ----
  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Reset to page 1 when search or date filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFrom, dateTo]);

  const paginatedSubmissions = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubmissions
      .slice(start, start + ITEMS_PER_PAGE)
      .map((s, i) => ({ ...s, startIndex: start + i + 1 }));
  }, [filteredSubmissions, safeCurrentPage]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    setExpandedSubmissions(new Set());
  };

  // ---- STATS ----
  const statsSubmissions = useMemo(() => {
    let result = submissions;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((s) => new Date(s.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((s) => new Date(s.created_at) <= to);
    }
    return result;
  }, [submissions, dateFrom, dateTo]);

  const dailyCounts = useMemo((): DailyCount[] => {
    const counts: Record<string, number> = {};
    for (const s of statsSubmissions) {
      const day = new Date(s.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      counts[day] = (counts[day] || 0) + 1;
    }
    const result: DailyCount[] = Object.entries(counts).map(([date, count]) => ({
      date,
      count,
      label: date,
    }));
    result.sort((a, b) => a.date.localeCompare(b.date));
    return result;
  }, [statsSubmissions]);

  const maxDailyCount = Math.max(...dailyCounts.map((d) => d.count), 1);

  // ---- CSV EXPORT ----
  const handleExportCSV = () => {
    if (submissions.length === 0) return;
    setExportingCSV(true);
    setExported(false);

    try {
      const allLabels = submissions[0]?.responses.map((r) => r.label) || [];
      const escapeCSV = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      const header = ['N° soumission', 'Date', 'ID soumission', ...allLabels].map(escapeCSV).join(',');
      const rows = submissions.map((s, i) => {
        const cells = [
          String(i + 1),
          new Date(s.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          s.codeunique,
          ...allLabels.map((lbl) => {
            const resp = s.responses.find((r) => r.label === lbl);
            return resp?.value || '';
          }),
        ].map(escapeCSV);
        return cells.join(',');
      });

      const csvContent = '\uFEFF' + [header, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (form?.title || 'formulaire').replace(/[^a-z0-9-]/gi, '_').substring(0, 40);
      link.download = `reponses_${safeTitle}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 2500);
    } catch {
      setError('Erreur lors de l\'export.');
    }
    setExportingCSV(false);
  };

  // ---- PAGINATION RENDER ----
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | '...')[] = [];
    const delta = 2;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safeCurrentPage - delta && i <= safeCurrentPage + delta)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }

    return (
      <div className="flex items-center justify-center gap-1.5 mt-6">
        <button
          onClick={() => goToPage(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm text-foreground-500 hover:bg-background-100 cursor-pointer disabled:opacity-30 disabled:cursor-default transition-colors"
        >
          <i className="ri-arrow-left-s-line"></i>
        </button>
        {pages.map((page, idx) =>
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="w-9 h-9 flex items-center justify-center text-xs text-foreground-400">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer transition-colors ${
                safeCurrentPage === page
                  ? 'bg-primary-500 text-background-50'
                  : 'text-foreground-600 hover:bg-background-100'
              }`}
            >
              {page}
            </button>
          ),
        )}
        <button
          onClick={() => goToPage(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm text-foreground-500 hover:bg-background-100 cursor-pointer disabled:opacity-30 disabled:cursor-default transition-colors"
        >
          <i className="ri-arrow-right-s-line"></i>
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-50">
        <div className="flex items-center gap-3 text-foreground-500">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
          <span className="text-sm">Chargement des réponses...</span>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-3xl text-red-500"></i>
          </div>
          <p className="text-foreground-500 mb-4">{error || 'Formulaire introuvable.'}</p>
          <button
            onClick={() => navigate('/dashboard/forms')}
            className="px-5 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
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
            <i className="ri-chat-check-line mr-2 text-primary-500"></i>
            Réponses — {form.title}
          </h2>
          <p className="text-sm text-foreground-500 mt-1">
            {submissions.length} soumission{submissions.length !== 1 ? 's' : ''} reçue{submissions.length !== 1 ? 's' : ''}
            {(searchQuery.trim() || dateFrom || dateTo) && filteredSubmissions.length !== submissions.length && (
              <span className="text-accent-600 ml-1">— {filteredSubmissions.length} affichée{filteredSubmissions.length !== 1 ? 's' : ''}</span>
            )}
            {totalPages > 1 && (
              <span className="text-foreground-400 ml-1">
                · Page {safeCurrentPage}/{totalPages}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate(`/dashboard/forms/${formId}/edit`)}
            className="flex items-center gap-2 px-4 py-2.5 border border-background-200/70 rounded-full text-sm text-foreground-700 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap"
          >
            <i className="ri-edit-line"></i>
            Modifier
          </button>
          {/* ---- EXPAND / COLLAPSE ALL ---- */}
          {filteredSubmissions.length > 0 && (
            <button
              onClick={allExpanded ? collapseAll : expandAll}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-full text-sm font-medium cursor-pointer transition-colors whitespace-nowrap ${
                allExpanded
                  ? 'bg-primary-50 text-primary-700 border-primary-200'
                  : 'border-background-200/70 text-foreground-700 hover:bg-background-100'
              }`}
            >
              <i className={`ri-${allExpanded ? 'contract-up-down' : 'expand-up-down'}-line`}></i>
              {allExpanded ? 'Tout réduire' : 'Tout développer'}
            </button>
          )}
          <button
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-full text-sm font-medium cursor-pointer transition-colors whitespace-nowrap ${
              showStats
                ? 'bg-accent-100 text-accent-700 border-accent-200'
                : 'border-background-200/70 text-foreground-700 hover:bg-background-100'
            }`}
          >
            <i className="ri-bar-chart-line"></i>
            Stats
          </button>
          <button
            onClick={handleExportCSV}
            disabled={exportingCSV || submissions.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-secondary-600 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {exportingCSV ? (
              <>
                <i className="ri-loader-4-line animate-spin"></i>
                Export...
              </>
            ) : exported ? (
              <>
                <i className="ri-check-line"></i>
                Exporté !
              </>
            ) : (
              <>
                <i className="ri-file-download-line"></i>
                Exporter CSV
              </>
            )}
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors whitespace-nowrap"
          >
            <i className="ri-refresh-line"></i>
            Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 text-sm rounded-lg mb-4">
          <i className="ri-error-warning-line"></i>
          {error}
          <button onClick={() => setError(null)} className="ml-auto cursor-pointer hover:text-red-900">
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      {/* ---- STATS PANEL ---- */}
      {showStats && submissions.length > 0 && (
        <div className="mb-6 bg-background-50 border border-background-200/70 rounded-lg p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
              <i className="ri-bar-chart-line text-accent-500"></i>
              Soumissions par jour
            </h3>
            <span className="text-xs text-foreground-400">
              {dailyCounts.length} jour{dailyCounts.length > 1 ? 's' : ''} d'activité
            </span>
          </div>

          {/* Mini stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
              <p className="text-xs text-foreground-400 mb-1">Total</p>
              <p className="text-lg font-bold font-heading text-foreground-950">{statsSubmissions.length}</p>
            </div>
            <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
              <p className="text-xs text-foreground-400 mb-1">Aujourd'hui</p>
              <p className="text-lg font-bold font-heading text-foreground-950">
                {dailyCounts.find((d) => d.date === new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }))?.count || 0}
              </p>
            </div>
            <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
              <p className="text-xs text-foreground-400 mb-1">Pic journalier</p>
              <p className="text-lg font-bold font-heading text-accent-600">{maxDailyCount}</p>
            </div>
            <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
              <p className="text-xs text-foreground-400 mb-1">Moy./jour</p>
              <p className="text-lg font-bold font-heading text-foreground-950">
                {(statsSubmissions.length / Math.max(dailyCounts.length, 1)).toFixed(1)}
              </p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-1.5 h-[160px] px-1">
            {dailyCounts.map((d) => {
              const heightPct = (d.count / maxDailyCount) * 100;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0 group">
                  <span className="text-xs font-medium text-foreground-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.count}
                  </span>
                  <div className="w-full flex-1 flex flex-col justify-end">
                    <div
                      className="w-full rounded-t-md bg-accent-400 hover:bg-accent-500 transition-all duration-200 cursor-default min-h-[4px]"
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                      title={`${d.label}: ${d.count} soumission${d.count > 1 ? 's' : ''}`}
                    ></div>
                  </div>
                  <span className="text-[10px] text-foreground-400 truncate w-full text-center leading-tight">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- SEARCH + DATE FILTER BAR ---- */}
      {submissions.length > 0 && (
        <div className="mb-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans les réponses..."
              className="w-full pl-10 pr-10 py-2.5 bg-background-50 border border-background-200/70 rounded-full text-sm text-foreground-900 focus:outline-none focus:border-primary-300 placeholder:text-foreground-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-foreground-400 hover:text-foreground-600 cursor-pointer transition-colors"
              >
                <i className="ri-close-line text-sm"></i>
              </button>
            )}
          </div>

          {/* Date range */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <i className="ri-calendar-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm pointer-events-none"></i>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full sm:w-auto pl-9 pr-3 py-2 bg-background-50 border border-background-200/70 rounded-full text-sm text-foreground-900 focus:outline-none focus:border-primary-300 cursor-pointer"
                />
              </div>
              <span className="text-xs text-foreground-400 flex-shrink-0">à</span>
              <div className="relative flex-1 sm:flex-initial">
                <i className="ri-calendar-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm pointer-events-none"></i>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full sm:w-auto pl-9 pr-3 py-2 bg-background-50 border border-background-200/70 rounded-full text-sm text-foreground-900 focus:outline-none focus:border-primary-300 cursor-pointer"
                />
              </div>
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-foreground-500 hover:text-foreground-800 hover:bg-background-100 rounded-full cursor-pointer transition-colors whitespace-nowrap"
              >
                <i className="ri-close-circle-line"></i>
                Réinitialiser
              </button>
            )}
            {(dateFrom || dateTo) && (
              <span className="text-xs text-accent-600 font-medium whitespace-nowrap">
                {filteredSubmissions.length} résultat{filteredSubmissions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mb-3">
            <i className="ri-inbox-line text-2xl text-foreground-300"></i>
          </div>
          <p className="text-foreground-500 mb-1">Aucune réponse reçue</p>
          <p className="text-xs text-foreground-400 mb-4">
            Partagez le lien de votre formulaire pour recevoir des soumissions
          </p>
          <a
            href={`/forms/${formId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors"
          >
            <i className="ri-eye-line"></i>
            Voir le formulaire public
          </a>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="flex flex-col items-center py-16 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mb-3">
            <i className="ri-filter-off-line text-2xl text-foreground-300"></i>
          </div>
          <p className="text-foreground-500 mb-1">
            {searchQuery.trim() ? `Aucun résultat pour "${searchQuery}"` : 'Aucune soumission sur cette période'}
          </p>
          <p className="text-xs text-foreground-400">
            {searchQuery.trim() ? 'Essayez un autre terme de recherche' : 'Essayez une autre plage de dates'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedSubmissions.map((submission) => (
            <div
              key={submission.codeunique}
              className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden transition-colors hover:border-background-300/60"
            >
              <div
                onClick={() => toggleExpand(submission.codeunique)}
                className="flex items-center justify-between px-5 py-4 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-primary-600">#{submission.startIndex}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground-900 truncate">
                      Soumission #{submission.startIndex}
                    </p>
                    <p className="text-xs text-foreground-400">
                      {new Date(submission.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSubmission(submission.codeunique);
                    }}
                    disabled={deleting === submission.codeunique}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-300 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                    title="Supprimer cette soumission"
                  >
                    {deleting === submission.codeunique ? (
                      <i className="ri-loader-4-line animate-spin text-sm"></i>
                    ) : (
                      <i className="ri-delete-bin-line text-sm"></i>
                    )}
                  </button>
                  <i className={`ri-${expandedSubmissions.has(submission.codeunique) ? 'arrow-up-s' : 'arrow-down-s'}-line text-foreground-400 text-lg transition-transform`}></i>
                </div>
              </div>

              {expandedSubmissions.has(submission.codeunique) && (
                <div className="border-t border-background-200/70 px-5 py-4 bg-background-50/50 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {submission.responses.map((resp, rIdx) => (
                      <div key={rIdx} className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-foreground-500">{resp.label}</span>
                        <span className={`text-sm text-foreground-900 bg-background-50 border border-background-200/70 rounded-lg px-3 py-2 break-words ${
                          searchQuery.trim() && resp.value.toLowerCase().includes(searchQuery.toLowerCase())
                            ? 'ring-2 ring-accent-300 bg-accent-50/50'
                            : ''
                        }`}>
                          {resp.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-background-200/70">
                    <p className="text-xs text-foreground-400">
                      ID soumission : <code className="text-xs bg-background-100 px-1.5 py-0.5 rounded">{submission.codeunique}</code>
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
          {renderPagination()}
        </div>
      )}
    </div>
  );
}