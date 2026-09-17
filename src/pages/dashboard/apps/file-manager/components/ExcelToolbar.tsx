import { useState, type ReactNode } from 'react';
import type { CellBorders, ExcelFormat, NumFormat } from '@/lib/documents';
import { NUM_FORMAT_OPTIONS } from '@/lib/excelNumberFormat';

export interface ExcelToolbarProps {
  hasSelection: boolean;
  fmt: ExcelFormat;
  numLabel: string;
  zoom: number;
  isMerged: boolean;
  painterActive: boolean;
  onFormatPainter: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPrint: () => void;
  onZoom: (z: number) => void;
  onPickNumFormat: (f: NumFormat, symbol?: string) => void;
  onAdjustDecimals: (d: number) => void;
  onOpenCustomFormat: () => void;
  onToggle: (patch: Partial<ExcelFormat>) => void;
  onSetBorder: (patch: Partial<CellBorders> | 'none') => void;
  onMerge: () => void;
  onMergeCenter: () => void;
  onUnmerge: () => void;
  onConditionalFormat: () => void;
  onAiSummarize: () => void;
}

const FONT_FAMILIES = [
  'Arial',
  'Roboto',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Trebuchet MS',
  'Courier New',
  'Tahoma',
  'Impact',
];

const FONT_SIZES = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48];

const CURRENCIES: { symbol: string; label: string }[] = [
  { symbol: '€', label: 'Euro (€)' },
  { symbol: '$', label: 'Dollar ($)' },
  { symbol: '£', label: 'Livre (£)' },
  { symbol: '¥', label: 'Yen (¥)' },
];

const ROTATIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Aucune rotation' },
  { value: 45, label: 'Incliner vers le haut' },
  { value: -45, label: 'Incliner vers le bas' },
  { value: 90, label: 'Faire pivoter vers le haut' },
  { value: -90, label: 'Faire pivoter vers le bas' },
];

const BORDER_ITEMS: { key: string; label: string; patch: Partial<CellBorders> }[] = [
  { key: 'all', label: 'Toutes les bordures', patch: { top: true, right: true, bottom: true, left: true } },
  { key: 'top', label: 'Bordure supérieure', patch: { top: true } },
  { key: 'bottom', label: 'Bordure inférieure', patch: { bottom: true } },
  { key: 'left', label: 'Bordure de gauche', patch: { left: true } },
  { key: 'right', label: 'Bordure de droite', patch: { right: true } },
];

function Sep() {
  return <span className="w-px h-5 bg-background-200/70 mx-1 flex-shrink-0" />;
}

function Btn({
  icon,
  title,
  active,
  disabled,
  onClick,
}: {
  icon: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`w-8 h-8 rounded flex items-center justify-center cursor-pointer transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
        active ? 'bg-primary-100 text-primary-700' : 'text-foreground-600 hover:bg-background-100'
      }`}
    >
      <i className={`${icon} text-[15px]`}></i>
    </button>
  );
}

function Dropdown({
  open,
  onClose,
  width = 200,
  align = 'left',
  children,
}: {
  open: boolean;
  onClose: () => void;
  width?: number;
  align?: 'left' | 'right';
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}></div>
      <div
        className={`absolute top-full mt-1 z-50 rounded-lg border border-background-200/70 bg-background-50 py-1 ${
          align === 'right' ? 'right-0' : 'left-0'
        }`}
        style={{ width }}
      >
        {children}
      </div>
    </>
  );
}

function MenuItem({
  icon,
  label,
  checked,
  onClick,
}: {
  icon?: string;
  label: string;
  checked?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground-800 hover:bg-background-100 cursor-pointer whitespace-nowrap"
    >
      {icon ? (
        <i className={`${icon} text-sm text-foreground-500`}></i>
      ) : (
        <span className="w-4 flex-shrink-0"></span>
      )}
      <span className="flex-1">{label}</span>
      {checked && <i className="ri-check-line text-primary-600"></i>}
    </button>
  );
}

export default function ExcelToolbar({
  hasSelection,
  fmt,
  numLabel,
  zoom,
  isMerged,
  painterActive,
  onFormatPainter,
  onUndo,
  onRedo,
  onPrint,
  onZoom,
  onPickNumFormat,
  onAdjustDecimals,
  onOpenCustomFormat,
  onToggle,
  onSetBorder,
  onMerge,
  onMergeCenter,
  onUnmerge,
  onConditionalFormat,
  onAiSummarize,
}: ExcelToolbarProps) {
  const [open, setOpen] = useState<string | null>(null);
  const close = () => setOpen(null);
  const toggle = (key: string) => setOpen((prev) => (prev === key ? null : key));

  const numActive = (numFormat: NumFormat, symbol?: string) =>
    fmt.numFormat === numFormat &&
    (numFormat !== 'currency' || fmt.currencySymbol === symbol);

  return (
    <div className="flex items-center gap-0.5 flex-wrap border-b border-background-200/70 px-2 py-1 bg-background-50">
      {/* Annuler / rétablir / imprimer */}
      <Btn icon="ri-arrow-go-back-line" title="Annuler (Ctrl+Z)" onClick={onUndo} />
      <Btn icon="ri-arrow-go-forward-line" title="Rétablir (Ctrl+Y)" onClick={onRedo} />
      <Btn icon="ri-printer-line" title="Imprimer (Ctrl+P)" onClick={onPrint} />
      <Btn
        icon="ri-paint-brush-line"
        title="Reproduire la mise en forme"
        active={painterActive}
        disabled={!hasSelection}
        onClick={onFormatPainter}
      />
      <Sep />

      {/* Zoom */}
      <div className="relative">
        <button
          type="button"
          onClick={() => toggle('zoom')}
          title="Niveau de zoom"
          className="h-8 px-2 rounded flex items-center gap-1 text-xs font-medium text-foreground-600 hover:bg-background-100 cursor-pointer"
        >
          {zoom} %
          <i className="ri-arrow-down-s-line text-xs"></i>
        </button>
        <Dropdown open={open === 'zoom'} onClose={close} width={120}>
          {[50, 75, 100, 125, 150, 200].map((z) => (
            <MenuItem
              key={z}
              label={`${z} %`}
              checked={zoom === z}
              onClick={() => {
                onZoom(z);
                close();
              }}
            />
          ))}
        </Dropdown>
      </div>
      <Sep />

      {/* Format monétaire */}
      <div className="relative">
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => toggle('currency')}
          title="Format monétaire"
          className={`inline-flex items-center gap-0.5 h-8 px-2 rounded cursor-pointer transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
            fmt.numFormat === 'currency' || fmt.numFormat === 'accounting'
              ? 'bg-primary-100 text-primary-700'
              : 'text-foreground-600 hover:bg-background-100'
          }`}
        >
          <span className="text-sm font-semibold">€</span>
          <i className="ri-arrow-down-s-line text-xs"></i>
        </button>
        <Dropdown open={open === 'currency'} onClose={close} width={180}>
          {CURRENCIES.map((c) => (
            <MenuItem
              key={c.symbol}
              label={c.label}
              checked={numActive('currency', c.symbol)}
              onClick={() => {
                onPickNumFormat('currency', c.symbol);
                close();
              }}
            />
          ))}
          <div className="h-px bg-background-100 my-1"></div>
          <MenuItem
            label="Format comptable"
            checked={numActive('accounting')}
            onClick={() => {
              onPickNumFormat('accounting');
              close();
            }}
          />
        </Dropdown>
      </div>

      {/* Pourcentage */}
      <Btn
        icon="ri-percent-line"
        title="Format pourcentage"
        active={fmt.numFormat === 'percent'}
        disabled={!hasSelection}
        onClick={() => onPickNumFormat('percent')}
      />

      {/* Décimales */}
      <div className="relative">
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => toggle('dec')}
          title="Diminuer les décimales"
          className="inline-flex items-center h-8 px-2 rounded text-foreground-600 hover:bg-background-100 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <span className="text-xs font-semibold">.0</span>
          <i className="ri-arrow-left-line text-[10px] ml-0.5"></i>
        </button>
        <Dropdown open={open === 'dec'} onClose={close} width={190}>
          <MenuItem
            label="Ajouter une décimale"
            icon="ri-add-line"
            onClick={() => {
              onAdjustDecimals(1);
              close();
            }}
          />
          <MenuItem
            label="Retirer une décimale"
            icon="ri-subtract-line"
            onClick={() => {
              onAdjustDecimals(-1);
              close();
            }}
          />
        </Dropdown>
      </div>
      <button
        type="button"
        disabled={!hasSelection}
        onClick={() => onAdjustDecimals(1)}
        title="Ajouter une décimale"
        className="inline-flex items-center h-8 px-2 rounded text-foreground-600 hover:bg-background-100 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
      >
        <i className="ri-arrow-right-line text-[10px]"></i>
        <span className="text-xs font-semibold">.00</span>
      </button>

      {/* Autres formats de nombre */}
      <div className="relative">
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => toggle('num')}
          title="Autres formats"
          className="inline-flex items-center gap-1 h-8 px-2 rounded text-xs font-medium text-foreground-600 hover:bg-background-100 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {numLabel}
          <i className="ri-arrow-down-s-line text-xs"></i>
        </button>
        <Dropdown open={open === 'num'} onClose={close} width={220}>
          {NUM_FORMAT_OPTIONS.map((f) => (
            <MenuItem
              key={f.key}
              label={f.label}
              checked={numActive(f.numFormat, f.currencySymbol)}
              onClick={() => {
                onPickNumFormat(f.numFormat, f.currencySymbol);
                close();
              }}
            />
          ))}
          <div className="h-px bg-background-100 my-1"></div>
          <MenuItem
            icon="ri-code-line"
            label="Format personnalisé…"
            onClick={() => {
              onOpenCustomFormat();
              close();
            }}
          />
        </Dropdown>
      </div>
      <Sep />

      {/* Police */}
      <select
        value={fmt.fontFamily || 'Arial'}
        disabled={!hasSelection}
        onChange={(e) => onToggle({ fontFamily: e.target.value })}
        title="Police"
        className="h-8 px-1 rounded border border-transparent hover:border-background-200/70 bg-transparent text-xs text-foreground-700 cursor-pointer focus:outline-none disabled:opacity-40 w-24"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      {/* Taille de police */}
      <select
        value={fmt.fontSize || 11}
        disabled={!hasSelection}
        onChange={(e) => onToggle({ fontSize: Number(e.target.value) })}
        title="Taille de police"
        className="h-8 px-1 rounded border border-transparent hover:border-background-200/70 bg-transparent text-xs text-foreground-700 cursor-pointer focus:outline-none disabled:opacity-40 w-14"
      >
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Sep />

      {/* Style du texte */}
      <Btn icon="ri-bold" title="Gras (Ctrl+B)" active={!!fmt.bold} disabled={!hasSelection} onClick={() => onToggle({ bold: !fmt.bold })} />
      <Btn icon="ri-italic" title="Italique (Ctrl+I)" active={!!fmt.italic} disabled={!hasSelection} onClick={() => onToggle({ italic: !fmt.italic })} />
      <Btn icon="ri-strikethrough" title="Barré" active={!!fmt.strike} disabled={!hasSelection} onClick={() => onToggle({ strike: !fmt.strike })} />

      {/* Couleur du texte */}
      <label
        title="Couleur du texte"
        className="relative w-8 h-8 rounded flex items-center justify-center cursor-pointer hover:bg-background-100"
      >
        <span className="flex flex-col items-center leading-none">
          <span className="text-[13px] font-semibold text-foreground-700">A</span>
          <span className="mt-0.5 w-4 h-1 rounded-sm" style={{ background: fmt.color || '#334155' }}></span>
        </span>
        <input
          type="color"
          value={fmt.color || '#334155'}
          disabled={!hasSelection}
          onChange={(e) => onToggle({ color: e.target.value })}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
      </label>

      {/* Couleur de remplissage */}
      <label
        title="Couleur de remplissage"
        className="relative w-8 h-8 rounded flex items-center justify-center cursor-pointer hover:bg-background-100"
      >
        <span className="flex flex-col items-center leading-none">
          <i className="ri-paint-fill text-[15px] text-foreground-600"></i>
          <span className="mt-0.5 w-4 h-1 rounded-sm border border-background-200/70" style={{ background: fmt.bg || '#ffffff' }}></span>
        </span>
        <input
          type="color"
          value={fmt.bg || '#ffffff'}
          disabled={!hasSelection}
          onChange={(e) => onToggle({ bg: e.target.value })}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
      </label>

      {/* Mise en forme conditionnelle */}
      <Btn
        icon="ri-contrast-2-line"
        title="Mise en forme conditionnelle"
        disabled={!hasSelection}
        onClick={onConditionalFormat}
      />
      <Sep />

      {/* Bordures */}
      <div className="relative">
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => toggle('border')}
          title="Bordures"
          className="inline-flex items-center gap-0.5 h-8 px-2 rounded text-foreground-600 hover:bg-background-100 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <i className="ri-layout-grid-line text-[15px]"></i>
          <i className="ri-arrow-down-s-line text-xs"></i>
        </button>
        <Dropdown open={open === 'border'} onClose={close} width={210}>
          {BORDER_ITEMS.map((b) => (
            <MenuItem
              key={b.key}
              label={b.label}
              onClick={() => {
                onSetBorder(b.patch);
                close();
              }}
            />
          ))}
          <div className="h-px bg-background-100 my-1"></div>
          <MenuItem
            label="Aucune bordure"
            onClick={() => {
              onSetBorder('none');
              close();
            }}
          />
        </Dropdown>
      </div>

      {/* Fusion */}
      <div className="relative">
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => toggle('merge')}
          title="Fusionner"
          className={`inline-flex items-center gap-0.5 h-8 px-2 rounded cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
            isMerged ? 'bg-primary-100 text-primary-700' : 'text-foreground-600 hover:bg-background-100'
          }`}
        >
          <i className="ri-layout-grid-fill text-[15px]"></i>
          <i className="ri-arrow-down-s-line text-xs"></i>
        </button>
        <Dropdown open={open === 'merge'} onClose={close} width={220}>
          <MenuItem
            label="Fusionner les cellules"
            icon="ri-layout-grid-fill"
            onClick={() => {
              onMerge();
              close();
            }}
          />
          <MenuItem
            label="Fusionner et centrer"
            icon="ri-layout-grid-fill"
            onClick={() => {
              onMergeCenter();
              close();
            }}
          />
          <MenuItem
            label="Annuler la fusion"
            icon="ri-layout-grid-line"
            onClick={() => {
              onUnmerge();
              close();
            }}
          />
        </Dropdown>
      </div>

      {/* Alignement horizontal */}
      <div className="relative">
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => toggle('align')}
          title="Alignement horizontal"
          className="inline-flex items-center gap-0.5 h-8 px-2 rounded text-foreground-600 hover:bg-background-100 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <i
            className={`text-[15px] ${
              fmt.align === 'center'
                ? 'ri-align-center'
                : fmt.align === 'right'
                  ? 'ri-align-right'
                  : 'ri-align-left'
            }`}
          ></i>
          <i className="ri-arrow-down-s-line text-xs"></i>
        </button>
        <Dropdown open={open === 'align'} onClose={close} width={180}>
          <MenuItem label="À gauche" icon="ri-align-left" checked={!fmt.align || fmt.align === 'left'} onClick={() => { onToggle({ align: 'left' }); close(); }} />
          <MenuItem label="Centré" icon="ri-align-center" checked={fmt.align === 'center'} onClick={() => { onToggle({ align: 'center' }); close(); }} />
          <MenuItem label="À droite" icon="ri-align-right" checked={fmt.align === 'right'} onClick={() => { onToggle({ align: 'right' }); close(); }} />
        </Dropdown>
      </div>

      {/* Alignement vertical */}
      <div className="relative">
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => toggle('valign')}
          title="Alignement vertical"
          className="inline-flex items-center gap-0.5 h-8 px-2 rounded text-foreground-600 hover:bg-background-100 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <i className="ri-align-vertically text-[15px]"></i>
          <i className="ri-arrow-down-s-line text-xs"></i>
        </button>
        <Dropdown open={open === 'valign'} onClose={close} width={180}>
          <MenuItem label="Haut" icon="ri-align-top" checked={fmt.valign === 'top'} onClick={() => { onToggle({ valign: 'top' }); close(); }} />
          <MenuItem label="Milieu" icon="ri-align-vertically" checked={fmt.valign === 'middle'} onClick={() => { onToggle({ valign: 'middle' }); close(); }} />
          <MenuItem label="Bas" icon="ri-align-bottom" checked={!fmt.valign || fmt.valign === 'bottom'} onClick={() => { onToggle({ valign: 'bottom' }); close(); }} />
        </Dropdown>
      </div>

      {/* Renvoi à la ligne */}
      <Btn
        icon="ri-text-wrap"
        title="Renvoi à la ligne"
        active={!!fmt.wrap}
        disabled={!hasSelection}
        onClick={() => onToggle({ wrap: !fmt.wrap })}
      />

      {/* Rotation du texte */}
      <div className="relative">
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => toggle('rotate')}
          title="Rotation du texte"
          className={`inline-flex items-center gap-0.5 h-8 px-2 rounded cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
            fmt.rotation ? 'bg-primary-100 text-primary-700' : 'text-foreground-600 hover:bg-background-100'
          }`}
        >
          <i className="ri-anticlockwise-2-line text-[15px]"></i>
          <i className="ri-arrow-down-s-line text-xs"></i>
        </button>
        <Dropdown open={open === 'rotate'} onClose={close} width={220}>
          {ROTATIONS.map((r) => (
            <MenuItem
              key={r.value}
              label={r.label}
              checked={(fmt.rotation || 0) === r.value}
              onClick={() => {
                onToggle({ rotation: r.value });
                close();
              }}
            />
          ))}
        </Dropdown>
      </div>

      {/* Assistant IA */}
      <div className="ml-auto flex items-center">
        <button
          type="button"
          onClick={onAiSummarize}
          title="Résumer ces données avec l'IA"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-secondary-100 text-secondary-900 hover:bg-secondary-200 text-xs font-medium cursor-pointer whitespace-nowrap transition-colors"
        >
          <i className="ri-sparkling-2-line"></i>
          Résumer ces données
        </button>
      </div>
    </div>
  );
}