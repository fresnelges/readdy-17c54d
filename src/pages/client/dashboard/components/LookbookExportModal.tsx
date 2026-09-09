import { useState, useEffect, useRef } from 'react';
import { ClosetItem } from './OutfitBuilderTab';

interface LookbookExportModalProps {
  open: boolean;
  onClose: () => void;
  outfitName: string;
  occasion: string;
  top?: ClosetItem | null;
  bottom?: ClosetItem | null;
  shoes?: ClosetItem | null;
  createdAt?: string;
}

const OCCASION_LABELS: Record<string, string> = {
  casual: 'Casual',
  travail: 'Travail',
  soiree: 'Soirée',
  sport: 'Sport',
  plage: 'Plage',
  formel: 'Formel',
};

const CANVAS_W = 600;
const CANVAS_H = 900;

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  bgColor: string
) {
  roundedRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
}

async function generateLookbookImage(
  outfitName: string,
  occasion: string,
  top?: ClosetItem | null,
  bottom?: ClosetItem | null,
  shoes?: ClosetItem | null,
  createdAt?: string
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // ── Background ──
  ctx.fillStyle = '#FAF7F2';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle border
  ctx.strokeStyle = '#E8E0D8';
  ctx.lineWidth = 1;
  roundedRect(ctx, 16, 16, CANVAS_W - 32, CANVAS_H - 32, 20);
  ctx.stroke();

  // ── Header ──
  const title = outfitName.trim() || 'Mon Outfit';
  ctx.fillStyle = '#1F2937';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, CANVAS_W / 2, 70);

  // Occasion badge
  const occLabel = OCCASION_LABELS[occasion] || occasion;
  ctx.font = '12px sans-serif';
  const badgeText = occLabel.toUpperCase();
  const badgeWidth = ctx.measureText(badgeText).width + 24;
  const badgeX = CANVAS_W / 2 - badgeWidth / 2;
  const badgeY = 88;
  const badgeH = 26;
  roundedRect(ctx, badgeX, badgeY, badgeWidth, badgeH, 13);
  ctx.fillStyle = '#8B5CF6';
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, CANVAS_W / 2, badgeY + badgeH / 2 + 1);

  // ── Images area ──
  const startY = 145;
  const slotHeight = 210;
  const gap = 16;
  const imgW = 220;
  const imgX = CANVAS_W / 2 - imgW / 2;

  const slots: { item?: ClosetItem | null; label: string; placeholder: string }[] = [
    { item: top, label: 'HAUT', placeholder: 'Aucun haut' },
    { item: bottom, label: 'BAS', placeholder: 'Aucun bas' },
    { item: shoes, label: 'CHAUSSURES', placeholder: 'Aucune chaussure' },
  ];

  for (let i = 0; i < slots.length; i++) {
    const { item, placeholder } = slots[i];
    const y = startY + i * (slotHeight + gap);
    const photo = item?.photos?.[0];

    // Shadow rect
    roundedRect(ctx, imgX + 3, y + 3, imgW, slotHeight, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fill();

    if (photo) {
      const img = await loadImage(photo);
      if (img) {
        // Clip rounded
        roundedRect(ctx, imgX, y, imgW, slotHeight, 12);
        ctx.save();
        ctx.clip();

        // Fit image inside rect (cover-like)
        const scale = Math.max(imgW / img.width, slotHeight / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = imgX + (imgW - dw) / 2;
        const dy = y + (slotHeight - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);

        ctx.restore();
      } else {
        drawPlaceholder(ctx, imgX, y, imgW, slotHeight, placeholder, '#F3F0EB');
      }
    } else {
      drawPlaceholder(ctx, imgX, y, imgW, slotHeight, placeholder, '#F3F0EB');
    }

    // Small label on top left of image
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(slots[i].label, imgX + 10, y + 10);
  }

  // ── Footer ──
  const dateStr = createdAt
    ? new Date(createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  ctx.fillStyle = '#9CA3AF';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(dateStr, CANVAS_W / 2, CANVAS_H - 36);

  // Brand line
  ctx.fillStyle = '#D1D5DB';
  ctx.font = '10px sans-serif';
  ctx.fillText('Mon Dressing', CANVAS_W / 2, CANVAS_H - 18);

  return canvas.toDataURL('image/png');
}

export default function LookbookExportModal({
  open,
  onClose,
  outfitName,
  occasion,
  top,
  bottom,
  shoes,
  createdAt,
}: LookbookExportModalProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!open) {
      setDataUrl(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setGenerating(true);
    setError(null);

    generateLookbookImage(outfitName, occasion, top, bottom, shoes, createdAt)
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
          setGenerating(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Erreur lors de la génération du lookbook.");
          setGenerating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, outfitName, occasion, top, bottom, shoes, createdAt]);

  const handleDownload = () => {
    if (!dataUrl || !linkRef.current) return;
    const safeName = (outfitName.trim() || 'outfit')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    linkRef.current.href = dataUrl;
    linkRef.current.download = `lookbook-${safeName}-${Date.now()}.png`;
    linkRef.current.click();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-background-50 rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-background-200/70 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-heading text-foreground-950">Lookbook</h3>
            <p className="text-xs text-foreground-500">Export visuel de votre outfit</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-background-100"
          >
            <i className="ri-close-line text-foreground-500"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center">
          {generating && (
            <div className="flex flex-col items-center justify-center py-12">
              <i className="ri-loader-4-line animate-spin text-3xl text-accent-500 mb-3"></i>
              <p className="text-sm text-foreground-500">Génération du lookbook...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <i className="ri-image-line text-xl text-red-500"></i>
              </div>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {dataUrl && !generating && (
            <>
              <div className="rounded-lg overflow-hidden border border-background-200/70 shadow-sm mb-4">
                <img
                  src={dataUrl}
                  alt="Lookbook"
                  className="w-full max-w-[340px] block"
                />
              </div>
              <p className="text-xs text-foreground-400 text-center mb-4">
                Format PNG &middot; {CANVAS_W}x{CANVAS_H}px
              </p>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-background-200/70 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-background-200/70 text-foreground-700 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-background-100 transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={handleDownload}
            disabled={!dataUrl || generating}
            className="flex-1 px-4 py-2.5 bg-accent-500 text-background-50 dark:text-foreground-950 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-accent-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <i className="ri-download-line"></i>
            Télécharger
          </button>
        </div>
      </div>

      <a ref={linkRef} className="hidden" aria-hidden="true" />
    </div>
  );
}