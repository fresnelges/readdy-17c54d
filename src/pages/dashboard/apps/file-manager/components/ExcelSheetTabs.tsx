import { useEffect, useRef, useState } from 'react';

interface SheetTab {
  id: string;
  name: string;
}

interface ExcelSheetTabsProps {
  sheets: SheetTab[];
  activeId: string;
  readOnly: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export default function ExcelSheetTabs({
  sheets,
  activeId,
  readOnly,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: ExcelSheetTabsProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) inputRef.current?.focus();
  }, [renamingId]);

  useEffect(() => {
    const close = () => setMenu(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const startRename = (id: string, name: string) => {
    setRenamingId(id);
    setDraft(name);
  };

  const commitRename = () => {
    if (renamingId) onRename(renamingId, draft);
    setRenamingId(null);
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-background-100 border-t border-background-200/70">
      {sheets.map((s) => {
        const active = s.id === activeId;
        const renaming = s.id === renamingId;
        return (
          <div
            key={s.id}
            className="relative"
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ id: s.id, x: e.clientX, y: e.clientY });
            }}
          >
            {renaming ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                className="px-3 py-1.5 rounded-md text-sm text-foreground-900 bg-white border border-primary-300 focus:outline-none w-32"
              />
            ) : (
              <button
                onClick={() => onSelect(s.id)}
                onDoubleClick={() => startRename(s.id, s.name)}
                title={s.name}
                className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap cursor-pointer transition-colors ${
                  active
                    ? 'bg-background-50 text-foreground-950 font-medium border border-background-200/70'
                    : 'text-foreground-600 hover:bg-background-200/50'
                }`}
              >
                {s.name}
              </button>
            )}
          </div>
        );
      })}
      {!readOnly && (
        <button
          onClick={onAdd}
          title="Ajouter une feuille"
          className="w-7 h-7 rounded-md flex items-center justify-center text-foreground-500 hover:bg-background-200/60 hover:text-foreground-800 cursor-pointer transition-colors"
        >
          <i className="ri-add-line text-base"></i>
        </button>
      )}

      {menu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenu(null)}
          ></div>
          <div
            className="fixed z-50 w-44 bg-background-50 border border-background-200/70 rounded-lg py-1"
            style={{ left: menu.x, top: menu.y }}
          >
            <button
              onClick={() => {
                const s = sheets.find((x) => x.id === menu.id);
                if (s) startRename(s.id, s.name);
                setMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground-700 hover:bg-background-100 text-left cursor-pointer whitespace-nowrap"
            >
              <i className="ri-edit-line text-foreground-400"></i>
              Renommer
            </button>
            <button
              onClick={() => {
                onDelete(menu.id);
                setMenu(null);
              }}
              disabled={sheets.length <= 1}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="ri-delete-bin-line"></i>
              Supprimer
            </button>
          </div>
        </>
      )}
    </div>
  );
}