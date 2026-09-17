import { useEffect, useMemo, useState } from 'react';
import { applyCustomFormat } from '@/lib/excelNumberFormat';

interface ExcelCustomFormatDialogProps {
  open: boolean;
  initialValue: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

// Formats prédéfinis couverts par le moteur (symbole, %, décimales, milliers).
const PRESET_FORMATS: { label: string; code: string }[] = [
  { label: 'Monnaie (€)', code: '# ##0,00 €' },
  { label: 'Monnaie ($)', code: '#,##0.00 $' },
  { label: 'Nombre 2 décimales', code: '# ##0,00' },
  { label: 'Nombre entier', code: '# ##0' },
  { label: 'Pourcentage', code: '0%' },
  { label: 'Pourcentage 2 décimales', code: '0,00%' },
  { label: 'Monnaie sans milliers', code: '0,00 €' },
  { label: 'Milliers sans décimales', code: '#,##0' },
];

const SAMPLE_VALUES = ['1234,56', '250', '0,25'];

export default function ExcelCustomFormatDialog({
  open,
  initialValue,
  onConfirm,
  onClose,
}: ExcelCustomFormatDialogProps) {
  const [value, setValue] = useState(initialValue || '# ##0,00 €');

  useEffect(() => {
    if (open) setValue(initialValue || '# ##0,00 €');
  }, [open, initialValue]);

  const previews = useMemo(() => {
    const code = value.trim();
    return SAMPLE_VALUES.map((sample) => ({
      sample,
      result: code ? applyCustomFormat(sample, code) : sample,
    }));
  }, [value]);

  if (!open) return null;

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onConfirm(v);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-foreground-950/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-background-50 border border-background-200/70 rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-background-200/70">
          <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center">
            <i className="ri-code-line"></i>
          </span>
          <h3 className="flex-1 text-sm font-semibold text-foreground-950">
            Format de nombre personnalisé
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:bg-background-100 cursor-pointer"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto flex flex-col gap-5">
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-2">
              Code de format
            </label>
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && value.trim()) submit();
              }}
              spellCheck={false}
              className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-white text-sm font-mono focus:outline-none focus:border-primary-300"
            />
            <p className="mt-1.5 text-[11px] text-foreground-400">
              Symboles supportés : € $ £ ¥, %, séparateur de milliers, nombre de décimales (0 ou #).
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-foreground-600 mb-2">Aperçu en direct</p>
            <div className="flex flex-col divide-y divide-background-200/70 rounded-lg border border-background-200/70 bg-white overflow-hidden">
              {previews.map((p) => (
                <div key={p.sample} className="flex items-center justify-between px-3 py-2.5">
                  <span className="font-mono text-xs text-foreground-500">{p.sample}</span>
                  <span className="text-foreground-400 text-sm">→</span>
                  <span className="font-mono text-sm font-semibold text-foreground-950">
                    {p.result}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-foreground-600 mb-2">Formats prédéfinis</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_FORMATS.map((f) => {
                const active = value.trim() === f.code;
                return (
                  <button
                    key={f.code}
                    onClick={() => setValue(f.code)}
                    className={`px-3 py-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                      active
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-background-200/70 bg-white hover:bg-background-50'
                    }`}
                  >
                    <span className="block text-xs font-medium text-foreground-800 whitespace-nowrap">
                      {f.label}
                    </span>
                    <span className="block mt-0.5 font-mono text-[11px] text-foreground-400 whitespace-nowrap">
                      {f.code}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm text-foreground-600 hover:bg-background-100 cursor-pointer whitespace-nowrap"
            >
              Annuler
            </button>
            <button
              onClick={submit}
              disabled={!value.trim()}
              className="px-4 py-2 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              Appliquer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}