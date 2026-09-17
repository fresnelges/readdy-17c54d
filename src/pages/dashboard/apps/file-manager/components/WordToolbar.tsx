import { useState } from 'react';

interface ToolbarProps {
  onExec: (command: string, value?: string) => void;
  onSaveSelection: () => void;
  onInsertLink: () => void;
  onInsertTable: () => void;
  onInsertImage: () => void;
  onOpenFind: () => void;
  onAddComment: () => void;
  onToggleComments: () => void;
  trackChanges: boolean;
  onToggleTrackChanges: () => void;
}

const FONT_SIZES = [
  { value: '1', label: '10' },
  { value: '2', label: '13' },
  { value: '3', label: '16' },
  { value: '4', label: '18' },
  { value: '5', label: '24' },
  { value: '6', label: '32' },
  { value: '7', label: '48' },
];

function ToolButton({
  title,
  icon,
  onMouseDown,
  onClick,
}: {
  title: string;
  icon: string;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      onClick={onClick}
      title={title}
      className="w-8 h-8 rounded-md hover:bg-background-200/70 flex items-center justify-center text-foreground-600 cursor-pointer whitespace-nowrap transition-colors"
    >
      <i className={`${icon} text-sm`}></i>
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-background-200/70 mx-1"></span>;
}

export default function WordToolbar({
  onExec,
  onSaveSelection,
  onInsertLink,
  onInsertTable,
  onInsertImage,
  onOpenFind,
  onAddComment,
  onToggleComments,
  trackChanges,
  onToggleTrackChanges,
}: ToolbarProps) {
  const stop = (e: React.MouseEvent) => e.preventDefault();
  const [fontSize, setFontSize] = useState('');

  return (
    <div className="flex items-center gap-0.5 flex-wrap border-b border-background-200/70 px-3 py-1.5 bg-background-100">
      <ToolButton title="Annuler" icon="ri-arrow-go-back-line" onMouseDown={stop} onClick={() => onExec('undo')} />
      <ToolButton title="Rétablir" icon="ri-arrow-go-forward-line" onMouseDown={stop} onClick={() => onExec('redo')} />
      <Divider />

      <select
        onMouseDown={onSaveSelection}
        onChange={(e) => {
          setFontSize('');
          onExec('fontSize', e.target.value);
        }}
        value={fontSize}
        className="h-8 px-1.5 rounded-md hover:bg-background-200/70 text-xs text-foreground-700 bg-transparent cursor-pointer focus:outline-none"
        title="Taille du texte"
      >
        <option value="" disabled>
          Taille
        </option>
        {FONT_SIZES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <Divider />

      <ToolButton title="Gras" icon="ri-bold" onMouseDown={stop} onClick={() => onExec('bold')} />
      <ToolButton title="Italique" icon="ri-italic" onMouseDown={stop} onClick={() => onExec('italic')} />
      <ToolButton title="Souligné" icon="ri-underline" onMouseDown={stop} onClick={() => onExec('underline')} />
      <ToolButton title="Barré" icon="ri-strikethrough" onMouseDown={stop} onClick={() => onExec('strikeThrough')} />
      <ToolButton title="Exposant" icon="ri-superscript" onMouseDown={stop} onClick={() => onExec('superscript')} />
      <ToolButton title="Indice" icon="ri-subscript" onMouseDown={stop} onClick={() => onExec('subscript')} />
      <Divider />

      <label
        title="Couleur du texte"
        className="relative w-8 h-8 rounded-md hover:bg-background-200/70 flex items-center justify-center cursor-pointer"
      >
        <i className="ri-font-color text-sm text-foreground-600"></i>
        <input
          type="color"
          onMouseDown={onSaveSelection}
          onChange={(e) => onExec('foreColor', e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
      <label
        title="Surligner"
        className="relative w-8 h-8 rounded-md hover:bg-background-200/70 flex items-center justify-center cursor-pointer"
      >
        <i className="ri-mark-pen-line text-sm text-foreground-600"></i>
        <input
          type="color"
          onMouseDown={onSaveSelection}
          onChange={(e) => onExec('hiliteColor', e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
      <ToolButton title="Effacer la mise en forme" icon="ri-format-clear" onMouseDown={stop} onClick={() => onExec('removeFormat')} />
      <Divider />

      <ToolButton title="Titre 1" icon="ri-h-1" onMouseDown={stop} onClick={() => onExec('formatBlock', 'h1')} />
      <ToolButton title="Titre 2" icon="ri-h-2" onMouseDown={stop} onClick={() => onExec('formatBlock', 'h2')} />
      <ToolButton title="Titre 3" icon="ri-h-3" onMouseDown={stop} onClick={() => onExec('formatBlock', 'h3')} />
      <ToolButton title="Paragraphe" icon="ri-text" onMouseDown={stop} onClick={() => onExec('formatBlock', 'p')} />
      <Divider />

      <ToolButton title="Liste à puces" icon="ri-list-unordered" onMouseDown={stop} onClick={() => onExec('insertUnorderedList')} />
      <ToolButton title="Liste numérotée" icon="ri-list-ordered" onMouseDown={stop} onClick={() => onExec('insertOrderedList')} />
      <Divider />

      <ToolButton title="Aligner à gauche" icon="ri-align-left" onMouseDown={stop} onClick={() => onExec('justifyLeft')} />
      <ToolButton title="Centrer" icon="ri-align-center" onMouseDown={stop} onClick={() => onExec('justifyCenter')} />
      <ToolButton title="Aligner à droite" icon="ri-align-right" onMouseDown={stop} onClick={() => onExec('justifyRight')} />
      <ToolButton title="Justifier" icon="ri-align-justify" onMouseDown={stop} onClick={() => onExec('justifyFull')} />
      <Divider />

      <ToolButton title="Insérer un lien" icon="ri-link" onMouseDown={stop} onClick={onInsertLink} />
      <ToolButton title="Insérer un tableau" icon="ri-table-line" onMouseDown={stop} onClick={onInsertTable} />
      <ToolButton title="Insérer une image" icon="ri-image-line" onMouseDown={stop} onClick={onInsertImage} />
      <ToolButton title="Citation" icon="ri-double-quotes-l" onMouseDown={stop} onClick={() => onExec('formatBlock', 'blockquote')} />
      <Divider />
      <ToolButton title="Commenter la sélection" icon="ri-chat-new-line" onMouseDown={stop} onClick={onAddComment} />
      <ToolButton title="Afficher les commentaires" icon="ri-chat-1-line" onMouseDown={stop} onClick={onToggleComments} />
      <Divider />
      <ToolButton title="Rechercher et remplacer" icon="ri-search-line" onMouseDown={stop} onClick={onOpenFind} />
      <Divider />
      <button
        type="button"
        onMouseDown={stop}
        onClick={onToggleTrackChanges}
        title={trackChanges ? 'Désactiver le suivi des modifications' : 'Activer le suivi des modifications'}
        className={`flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap transition-colors ${
          trackChanges ? 'bg-accent-100 text-accent-700' : 'text-foreground-600 hover:bg-background-200/70'
        }`}
      >
        <i className="ri-edit-circle-line text-sm"></i>
        Suivi
      </button>
    </div>
  );
}