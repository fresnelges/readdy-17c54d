import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface MenuEntry {
  label?: string;
  icon?: string;
  shortcut?: string;
  run?: () => void;
  children?: MenuEntry[];
  divider?: boolean;
  checked?: boolean;
  disabled?: boolean;
  /** Rend l'élément comme une pastille de couleur */
  color?: string;
  /** Rend les enfants dans une grille de N colonnes */
  grid?: number;
  /** Style d'alerte (suppression, etc.) */
  danger?: boolean;
}

export interface MenuGroup {
  key: string;
  label: string;
  entries: MenuEntry[];
}

interface MenuBarProps {
  groups: MenuGroup[];
  onHelp?: () => void;
}

function MenuNode({
  entry,
  onRun,
  onClose,
}: {
  entry: MenuEntry;
  onRun: (entry: MenuEntry) => void;
  onClose: () => void;
}) {
  const [subOpen, setSubOpen] = useState(false);
  const [openLeft, setOpenLeft] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!subOpen) {
      setOpenLeft(false);
      return;
    }
    const trigger = triggerRef.current;
    const sub = subRef.current;
    if (!trigger || !sub) return;
    setOpenLeft(
      trigger.getBoundingClientRect().right + sub.getBoundingClientRect().width >
        window.innerWidth - 8,
    );
  }, [subOpen]);

  if (entry.divider) {
    return <div className="h-px bg-background-200/70 my-1"></div>;
  }

  const hasChildren = !!entry.children && entry.children.length > 0;
  const isGrid = !!entry.grid && hasChildren;

  const itemClass = `w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
    entry.danger ? 'text-red-600 hover:bg-red-50' : 'text-foreground-700 hover:bg-background-100'
  } ${entry.disabled ? '' : 'cursor-pointer'}`;

  const content = (
    <>
      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
        {entry.checked ? (
          <i className="ri-check-line text-primary-600"></i>
        ) : entry.icon ? (
          <i className={`${entry.icon} text-foreground-500`}></i>
        ) : null}
      </span>
      <span className="flex-1 truncate">{entry.label}</span>
      {entry.shortcut && (
        <span className="text-[11px] text-foreground-400 ml-3 flex-shrink-0">{entry.shortcut}</span>
      )}
      {hasChildren && <i className="ri-arrow-right-s-line text-foreground-400 flex-shrink-0"></i>}
    </>
  );

  if (!hasChildren) {
    return (
      <button
        type="button"
        disabled={entry.disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          onRun(entry);
          onClose();
        }}
        className={itemClass}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={() => setSubOpen(true)}
      onMouseLeave={() => setSubOpen(false)}
    >
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        className={itemClass}
      >
        {content}
      </button>
      {subOpen && (
        <div
          ref={subRef}
          className={`absolute top-0 z-50 bg-background-50 border border-background-200/70 rounded-lg min-w-[220px] ${
            openLeft ? 'right-full' : 'left-full'
          }`}
        >
          {isGrid ? (
            <div className="p-2">
              <p className="px-1 pb-2 text-[11px] font-medium text-foreground-400">{entry.label}</p>
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${entry.grid}, minmax(0, 1fr))` }}
              >
                {entry.children!.map((child, idx) =>
                  child.color ? (
                    <button
                      key={`${child.label}-${idx}`}
                      type="button"
                      title={child.label}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onRun(child);
                        onClose();
                      }}
                      className="w-6 h-6 rounded-md border border-background-300/60 cursor-pointer hover:scale-110 transition-transform"
                      style={{ background: child.color }}
                    ></button>
                  ) : (
                    <button
                      key={`${child.label}-${idx}`}
                      type="button"
                      title={child.label}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onRun(child);
                        onClose();
                      }}
                      className="w-7 h-7 rounded-md border border-background-200/70 bg-background-50 hover:bg-background-100 cursor-pointer flex items-center justify-center text-sm text-foreground-700"
                    >
                      {child.label}
                    </button>
                  ),
                )}
              </div>
            </div>
          ) : (
            <div className="py-1">
              {entry.children!.map((child, idx) => (
                <MenuNode key={child.label ?? `c${idx}`} entry={child} onRun={onRun} onClose={onClose} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WordMenuBar({ groups }: MenuBarProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [alignRight, setAlignRight] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const openTriggerRef = useRef<HTMLButtonElement | null>(null);
  const openMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openKey) return;
    const onDocClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenKey(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenKey(null);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [openKey]);

  useLayoutEffect(() => {
    if (!openKey) {
      setAlignRight(false);
      return;
    }
    const trigger = openTriggerRef.current;
    const menu = openMenuRef.current;
    if (!trigger || !menu) return;
    setAlignRight(
      trigger.getBoundingClientRect().left + menu.getBoundingClientRect().width >
        window.innerWidth - 8,
    );
  }, [openKey]);

  const handleRun = (entry: MenuEntry) => {
    if (entry.disabled || !entry.run) return;
    entry.run();
  };

  return (
    <div ref={barRef} className="flex items-center gap-0.5 flex-wrap px-2">
      {groups.map((group) => (
        <div key={group.key} className="relative">
          <button
            type="button"
            ref={openKey === group.key ? openTriggerRef : undefined}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => {
              if (openKey) setOpenKey(group.key);
            }}
            onClick={() => setOpenKey((prev) => (prev === group.key ? null : group.key))}
            className={`px-2.5 py-1.5 rounded-md text-sm whitespace-nowrap cursor-pointer transition-colors ${
              openKey === group.key
                ? 'bg-primary-100 text-primary-800'
                : 'text-foreground-700 hover:bg-background-100'
            }`}
          >
            {group.label}
          </button>
          {openKey === group.key && (
            <div
              ref={openMenuRef}
              className={`absolute top-full mt-0.5 z-50 bg-background-50 border border-background-200/70 rounded-lg min-w-[240px] ${
                alignRight ? 'right-0' : 'left-0'
              }`}
            >
              <div className="py-1">
                {group.entries.map((entry, idx) => (
                  <MenuNode
                    key={entry.label ?? `e${idx}`}
                    entry={entry}
                    onRun={handleRun}
                    onClose={() => setOpenKey(null)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}