interface ExcelFilterBarProps {
  columnLabel: string;
  values: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onClose: () => void;
}

export default function ExcelFilterBar({
  columnLabel,
  values,
  selected,
  onToggle,
  onSelectAll,
  onClear,
  onClose,
}: ExcelFilterBarProps) {
  const allChecked = values.length > 0 && values.every((v) => selected.has(v));

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-accent-50 border-b border-accent-200/70">
      <i className="ri-filter-3-line text-accent-700"></i>
      <span className="text-xs font-medium text-foreground-700 whitespace-nowrap">
        Filtrer la colonne {columnLabel}
      </span>
      <div className="flex items-center gap-1 flex-wrap flex-1">
        {values.map((v) => (
          <label
            key={v}
            className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-background-200/70 bg-background-50 text-xs text-foreground-700 cursor-pointer hover:bg-background-100"
          >
            <input
              type="checkbox"
              checked={selected.has(v)}
              onChange={() => onToggle(v)}
              className="accent-primary-500 cursor-pointer"
            />
            {v}
          </label>
        ))}
      </div>
      <button
        onClick={onSelectAll}
        className="text-xs text-primary-600 hover:underline cursor-pointer whitespace-nowrap"
      >
        {allChecked ? 'Tout décocher' : 'Tout cocher'}
      </button>
      <button
        onClick={onClose}
        className="text-xs text-foreground-500 hover:text-foreground-800 cursor-pointer whitespace-nowrap"
      >
        Effacer le filtre
      </button>
    </div>
  );
}