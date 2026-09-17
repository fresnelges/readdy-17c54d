import { useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Charge le worker pdf.js depuis le CDN, en utilisant la version exacte
// embarquée par react-pdf pour éviter tout décalage de version.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  pdfBase64: string;
  fileName: string;
}

// Convertit une chaîne base64 (brute ou en data URL) en Uint8Array (format attendu par pdf.js)
function base64ToUint8Array(base64: string): Uint8Array {
  let b64 = base64.trim();
  // Retire un éventuel préfixe « data:application/pdf;base64, » s'il est présent
  const commaIdx = b64.indexOf(',');
  if (b64.startsWith('data:') && commaIdx !== -1) {
    b64 = b64.slice(commaIdx + 1);
  }
  // Supprime les éventuels retours à la ligne / espaces insérés par le transport
  b64 = b64.replace(/\s+/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export default function PdfViewer({ pdfBase64, fileName }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [loadError, setLoadError] = useState(false);
  const [errorDetail, setErrorDetail] = useState('');

  const data = useMemo(() => {
    if (!pdfBase64) return null;
    try {
      return { data: base64ToUint8Array(pdfBase64) };
    } catch (err) {
      console.error('[PdfViewer] Décodage base64 impossible :', err);
      return null;
    }
  }, [pdfBase64]);

  if (!data || loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-20 px-6 text-center">
        <i className="ri-file-pdf-2-line text-5xl text-red-400"></i>
        <p className="mt-4 text-sm text-foreground-600">
          {loadError ? 'Impossible de charger ce PDF.' : 'Ce document PDF est vide ou illisible.'}
        </p>
        {errorDetail && (
          <p className="mt-2 max-w-md text-xs text-foreground-400 break-words">{errorDetail}</p>
        )}
      </div>
    );
  }

  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.4));
  const resetZoom = () => setScale(1);

  // Rendu de toutes les pages les unes à la suite (défilement continu).
  const pages = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div className="flex h-full flex-col bg-background-100">
      {/* Barre d'outils : zoom + nombre de pages */}
      <div className="flex items-center justify-center gap-2 border-b border-background-200/70 bg-background-50 px-4 py-2">
        <span className="flex items-center gap-1.5 text-sm text-foreground-600 whitespace-nowrap">
          <i className="ri-file-pdf-2-line text-red-500"></i>
          {numPages > 0 ? `${numPages} page${numPages > 1 ? 's' : ''}` : 'Chargement…'}
        </span>

        <span className="mx-2 h-5 w-px bg-background-200"></span>

        <button
          onClick={zoomOut}
          disabled={scale <= 0.4}
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-600 hover:bg-background-100 disabled:opacity-40 cursor-pointer transition-colors"
          title="Zoom arrière"
        >
          <i className="ri-zoom-out-line text-lg"></i>
        </button>
        <button
          onClick={resetZoom}
          className="min-w-[52px] rounded-full px-2 py-1 text-center text-sm text-foreground-700 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap"
          title="Réinitialiser le zoom"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={zoomIn}
          disabled={scale >= 3}
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-600 hover:bg-background-100 disabled:opacity-40 cursor-pointer transition-colors"
          title="Zoom avant"
        >
          <i className="ri-zoom-in-line text-lg"></i>
        </button>
      </div>

      {/* Zone de rendu : toutes les pages empilées verticalement */}
      <div className="flex-1 overflow-auto bg-background-200/50">
        <Document
          file={data}
          onLoadSuccess={({ numPages: total }) => setNumPages(total)}
          onLoadError={(err) => {
            console.error('[PdfViewer] Échec de chargement du PDF :', err);
            setErrorDetail(err instanceof Error ? err.message : String(err));
            setLoadError(true);
          }}
          loading={
            <div className="flex min-h-[300px] items-center justify-center">
              <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
            </div>
          }
          error={
            <div className="flex min-h-[300px] flex-col items-center justify-center">
              <i className="ri-file-pdf-2-line text-5xl text-red-400"></i>
              <p className="mt-4 text-sm text-foreground-600">Impossible de charger ce PDF.</p>
            </div>
          }
          className="flex flex-col items-center gap-6 px-6 py-8"
        >
          {pages.map((p) => (
            <div
              key={p}
              className="relative rounded-sm bg-white shadow-sm ring-1 ring-background-300/60"
            >
              <Page pageNumber={p} scale={scale} renderAnnotationLayer renderTextLayer />
              <span className="pointer-events-none absolute bottom-2 right-3 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white opacity-70">
                {p} / {numPages}
              </span>
            </div>
          ))}
        </Document>
      </div>

      <div className="border-t border-background-200/70 bg-background-50 px-4 py-1.5 text-center text-xs text-foreground-400">
        {fileName}
      </div>
    </div>
  );
}