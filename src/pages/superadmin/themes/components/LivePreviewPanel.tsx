import { useState, useEffect, useMemo } from 'react';

interface PageDef {
  key: string;
  label: string;
  icon: string;
}

interface ThemePage {
  id: number;
  idtheme: number;
  page_key: string;
  title: string;
  content: string;
}

interface LivePreviewPanelProps {
  stylesheet: string;
  pages: ThemePage[];
  pageDefs: PageDef[];
}

export default function LivePreviewPanel({ stylesheet, pages, pageDefs }: LivePreviewPanelProps) {
  const [activePreviewPage, setActivePreviewPage] = useState<string>('home');
  const [previewKey, setPreviewKey] = useState(0);

  const activePage = useMemo(
    () => pages.find((p) => p.page_key === activePreviewPage),
    [pages, activePreviewPage]
  );

  const previewBlobUrl = useMemo(() => {
    const pageContent = activePage?.content || '';
    const fullDoc = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${activePage?.title || 'Aperçu'}</title>
  <style>
    ${stylesheet}
  </style>
</head>
<body>
  ${pageContent || '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#999;"><p>Cette page est vide</p></div>'}
</body>
</html>`;

    const blob = new Blob([fullDoc], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [stylesheet, activePage, previewKey]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  const handleRefresh = () => {
    setPreviewKey((k) => k + 1);
  };

  const pagesWithContent = pages.filter((p) => p.content);
  const displayPages = pagesWithContent.length > 0 ? pagesWithContent : pageDefs;

  return (
    <div className="flex h-full">
      {/* Page selector sidebar */}
      <div className="w-[180px] border-r border-background-200/70 bg-background-100/50 overflow-y-auto flex-shrink-0">
        <div className="p-2">
          <div className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold px-2 py-1.5">
            Pages à prévisualiser
          </div>
          {displayPages.map((item) => {
            const pageKey = 'page_key' in item ? item.page_key : item.key;
            const label = 'page_key' in item
              ? (pageDefs.find((d) => d.key === pageKey)?.label || pageKey)
              : item.label;
            const isSelected = activePreviewPage === pageKey;
            const hasContent = 'page_key' in item ? !!item.content : false;
            return (
              <button
                key={pageKey}
                onClick={() => setActivePreviewPage(pageKey)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors cursor-pointer mb-0.5 ${
                  isSelected
                    ? 'bg-foreground-950 text-background-50'
                    : 'text-foreground-600 hover:bg-background-100 hover:text-foreground-900'
                }`}
              >
                <i className={`${'page_key' in item ? (pageDefs.find((d) => d.key === pageKey)?.icon || 'ri-file-line') : item.icon} text-sm flex-shrink-0`}></i>
                <span className="truncate">{label}</span>
                {hasContent && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-400 flex-shrink-0 ml-auto"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-background-200/70 bg-background-100/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-foreground-500 uppercase tracking-wider">Aperçu</span>
            <span className="text-[10px] text-foreground-400 bg-background-200/70 px-1.5 py-0.5 rounded">
              {activePage?.title || activePreviewPage}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-foreground-400">
              {stylesheet.length.toLocaleString()} car. CSS
            </span>
            <button
              onClick={handleRefresh}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-background-100 transition-colors cursor-pointer"
              title="Rafraîchir l'aperçu"
            >
              <i className="ri-refresh-line text-xs text-foreground-500"></i>
            </button>
          </div>
        </div>
        <div className="flex-1 bg-background-50">
          <iframe
            key={previewKey}
            src={previewBlobUrl}
            className="w-full h-full border-0"
            title="Aperçu du thème"
            sandbox="allow-scripts"
          />
        </div>
      </div>
    </div>
  );
}