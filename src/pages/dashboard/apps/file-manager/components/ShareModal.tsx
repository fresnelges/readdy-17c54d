import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  fetchCollaborators,
  addCollaborator,
  removeCollaborator,
  updateCollaboratorRole,
  findUsers,
  type DocCollaborator,
  type FoundUser,
  type CollabRole,
} from '@/lib/documents';
import type { DocDocument } from '@/lib/documents';

interface ShareModalProps {
  document: DocDocument;
  currentUserId: number;
  isOwner: boolean;
  onClose: () => void;
}

const ROLE_LABEL: Record<CollabRole, string> = {
  viewer: 'Consultation',
  editor: 'Édition',
};

export default function ShareModal({ document, currentUserId, isOwner, onClose }: ShareModalProps) {
  const [collaborators, setCollaborators] = useState<DocCollaborator[]>([]);
  const [ownerName, setOwnerName] = useState<string>('Propriétaire');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const debounceRef = useRef<number | null>(null);

  const load = async () => {
    try {
      const [collabs, ownerData] = await Promise.all([
        fetchCollaborators(document.id),
        supabase
          .from('users')
          .select('name, user_name')
          .eq('id', Number(document.user_id))
          .maybeSingle(),
      ]);
      setCollaborators(collabs);
      if (ownerData.data) {
        setOwnerName(ownerData.data.name || ownerData.data.user_name || 'Propriétaire');
      }
    } catch {
      setError('Erreur lors du chargement des membres.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document.id]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      const found = await findUsers(query);
      const collabIds = new Set(collaborators.map((c) => c.user_id));
      setResults(
        found.filter((u) => String(u.id) !== document.user_id && !collabIds.has(String(u.id))),
      );
      setSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleInvite = async (u: FoundUser, role: CollabRole) => {
    if (!isOwner) return;
    setError(null);
    try {
      const added = await addCollaborator(document.id, u, role, currentUserId);
      setCollaborators((prev) => {
        const without = prev.filter((c) => c.user_id !== added.user_id);
        return [...without, added];
      });
      setQuery('');
      setResults([]);
    } catch {
      setError('Erreur lors de l\'invitation.');
    }
  };

  const handleRemove = async (c: DocCollaborator) => {
    if (!isOwner) return;
    setError(null);
    setBusyId(c.id);
    try {
      await removeCollaborator(c.id);
      setCollaborators((prev) => prev.filter((x) => x.id !== c.id));
    } catch {
      setError('Erreur lors du retrait du membre.');
    }
    setBusyId(null);
  };

  const handleRoleChange = async (c: DocCollaborator, role: CollabRole) => {
    if (!isOwner) return;
    setError(null);
    setBusyId(c.id);
    try {
      await updateCollaboratorRole(c.id, role);
      setCollaborators((prev) => prev.map((x) => (x.id === c.id ? { ...x, role } : x)));
    } catch {
      setError('Erreur lors de la mise à jour du rôle.');
    }
    setBusyId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-background-50 rounded-xl animate-scale-in overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-background-200/70">
          <div>
            <h3 className="text-lg font-semibold font-heading text-foreground-950">Partager</h3>
            <p className="text-sm text-foreground-500 truncate">{document.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:bg-background-100 cursor-pointer"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg mb-3">
              <i className="ri-error-warning-line"></i>
              {error}
            </div>
          )}

          {/* Propriétaire */}
          <div className="flex items-center gap-3 p-3 bg-background-100 rounded-lg mb-5">
            <div className="w-9 h-9 rounded-full bg-primary-500 text-background-50 flex items-center justify-center font-semibold text-sm flex-shrink-0">
              {ownerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground-800 truncate">{ownerName}</p>
              <p className="text-xs text-foreground-400">Propriétaire</p>
            </div>
          </div>

          {/* Invitation */}
          {isOwner && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-500 mb-2">
                Inviter des membres
              </p>
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Email ou nom d'utilisateur..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
                />
              </div>

              {searching && (
                <div className="flex items-center gap-2 text-sm text-foreground-400 py-2">
                  <i className="ri-loader-4-line animate-spin"></i>
                  Recherche...
                </div>
              )}

              {!searching && results.length > 0 && (
                <div className="mt-2 border border-background-200/70 rounded-lg overflow-hidden bg-white">
                  {results.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-background-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                        {(u.name || u.user_name).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground-800 truncate">
                          {u.name || u.user_name}
                        </p>
                        <p className="text-xs text-foreground-400 truncate">{u.email}</p>
                      </div>
                      <button
                        onClick={() => handleInvite(u, 'editor')}
                        className="px-3 py-1.5 rounded-full bg-primary-500 text-background-50 text-xs font-medium hover:bg-primary-600 cursor-pointer whitespace-nowrap"
                      >
                        Inviter
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!searching && query.trim() && results.length === 0 && (
                <p className="text-sm text-foreground-400 py-2">Aucun utilisateur trouvé.</p>
              )}
            </div>
          )}

          {/* Membres avec accès */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-500 mb-2">
              Membres avec accès ({collaborators.length})
            </p>
            {collaborators.length === 0 ? (
              <p className="text-sm text-foreground-400">Aucun membre invité pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {collaborators.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 border border-background-200/70 rounded-lg">
                    <div className="w-9 h-9 rounded-full bg-background-100 text-foreground-600 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {(c.user_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground-800 truncate">{c.user_name || 'Utilisateur'}</p>
                      <p className="text-xs text-foreground-400 truncate">{c.user_email || ''}</p>
                    </div>
                    {isOwner ? (
                      <>
                        <select
                          value={c.role}
                          onChange={(e) => handleRoleChange(c, e.target.value as CollabRole)}
                          disabled={busyId === c.id}
                          className="px-2 py-1.5 text-xs bg-white border border-background-200/70 rounded-md text-foreground-700 cursor-pointer focus:outline-none"
                        >
                          <option value="viewer">{ROLE_LABEL.viewer}</option>
                          <option value="editor">{ROLE_LABEL.editor}</option>
                        </select>
                        <button
                          onClick={() => handleRemove(c)}
                          disabled={busyId === c.id}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer disabled:opacity-40"
                          title="Retirer l'accès"
                        >
                          {busyId === c.id ? (
                            <i className="ri-loader-4-line animate-spin text-sm"></i>
                          ) : (
                            <i className="ri-user-unfollow-line text-sm"></i>
                          )}
                        </button>
                      </>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-background-100 text-xs text-foreground-600 whitespace-nowrap">
                        {ROLE_LABEL[c.role]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}