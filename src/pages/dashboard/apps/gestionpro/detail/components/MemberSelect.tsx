import { useState, useRef, useEffect } from 'react';
import MemberAvatar from './MemberAvatar';

export interface MemberOption {
  id: number;
  name: string;
  image?: string | null;
}

interface MemberSelectProps {
  value: string;
  members: MemberOption[];
  onChange: (name: string) => void;
  placeholder?: string;
}

export default function MemberSelect({
  value,
  members,
  onChange,
  placeholder = 'Non assigné',
}: MemberSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = members.find((m) => m.name === value) || null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 border border-background-200/70 rounded-lg text-sm cursor-pointer hover:bg-background-100 focus:outline-none focus:border-primary-300 transition-colors"
      >
        {selected ? (
          <>
            <MemberAvatar image={selected.image} name={selected.name} size="sm" />
            <span className="text-foreground-900 truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-foreground-400">{placeholder}</span>
        )}
        <i className="ri-arrow-down-s-line text-foreground-400 ml-auto flex-shrink-0"></i>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 z-30 bg-background-50 border border-background-200/70 rounded-lg shadow-sm py-1 max-h-56 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap"
          >
            <span className="w-6 h-6 flex-shrink-0"></span>
            {placeholder}
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onChange(m.name); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-foreground-900 hover:bg-background-100 cursor-pointer transition-colors"
            >
              <MemberAvatar image={m.image} name={m.name} size="sm" />
              <span className="truncate">{m.name}</span>
              {value === m.name && <i className="ri-check-line text-primary-500 ml-auto flex-shrink-0"></i>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}