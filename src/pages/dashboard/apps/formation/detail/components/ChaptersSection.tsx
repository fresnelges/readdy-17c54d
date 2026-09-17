import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Chapter, Lesson } from '@/pages/dashboard/apps/formation/detail/types';

interface Props {
  formationId: number;
  chapters: Chapter[];
  lessons: Lesson[];
  onChanged: () => void;
}

export default function ChaptersSection({ formationId, chapters, lessons, onChanged }: Props) {
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newChapter, setNewChapter] = useState({ titre: '', description: '' });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [lessonDrafts, setLessonDrafts] = useState<Record<number, { titre: string; contenu: string }>>({});
  const [editLessonId, setEditLessonId] = useState<number | null>(null);
  const [editLessonDraft, setEditLessonDraft] = useState({ titre: '', contenu: '' });
  const [error, setError] = useState('');

  const lessonsForChapter = (chapterId: number) =>
    lessons.filter((l) => l.chapitre_id === chapterId);

  const addChapter = async () => {
    const titre = newChapter.titre.trim();
    if (!titre) return;
    setError('');
    const { error: err } = await supabase.from('chapitreformations').insert({
      id_formation: formationId,
      titre,
      description: newChapter.description || '',
      image: '',
    });
    if (err) {
      setError(err.message);
      return;
    }
    setNewChapter({ titre: '', description: '' });
    setShowAddChapter(false);
    onChanged();
  };

  const deleteChapter = async (id: number) => {
    if (!window.confirm('Supprimer ce chapitre et tous ses sous-chapitres ?')) return;
    setError('');
    const chapterLessons = lessonsForChapter(id);
    if (chapterLessons.length > 0) {
      await supabase.from('lecons').delete().in('id', chapterLessons.map((l) => l.id));
    }
    await supabase.from('chapitreformations').delete().eq('id', id);
    setExpanded(null);
    onChanged();
  };

  const toggleChapter = (id: number) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  const updateLessonDraft = (chapterId: number, patch: Partial<{ titre: string; contenu: string }>) => {
    setLessonDrafts((prev) => ({
      ...prev,
      [chapterId]: { ...(prev[chapterId] || { titre: '', contenu: '' }), ...patch },
    }));
  };

  const addLesson = async (chapterId: number) => {
    const draft = lessonDrafts[chapterId];
    if (!draft || !draft.titre.trim()) return;
    setError('');
    const { error: err } = await supabase.from('lecons').insert({
      cours_id: formationId,
      chapitre_id: chapterId,
      titre: draft.titre.trim(),
      contenu: draft.contenu || '',
      ordre: lessonsForChapter(chapterId).length,
    });
    if (err) {
      setError(err.message);
      return;
    }
    updateLessonDraft(chapterId, { titre: '', contenu: '' });
    onChanged();
  };

  const startEditLesson = (lesson: Lesson) => {
    setEditLessonId(lesson.id);
    setEditLessonDraft({ titre: lesson.titre, contenu: lesson.contenu || '' });
  };

  const saveEditLesson = async () => {
    if (!editLessonId || !editLessonDraft.titre.trim()) return;
    setError('');
    const { error: err } = await supabase
      .from('lecons')
      .update({ titre: editLessonDraft.titre.trim(), contenu: editLessonDraft.contenu })
      .eq('id', editLessonId);
    if (err) {
      setError(err.message);
      return;
    }
    setEditLessonId(null);
    onChanged();
  };

  const deleteLesson = async (id: number) => {
    if (!window.confirm('Supprimer ce sous-chapitre ?')) return;
    setError('');
    await supabase.from('lecons').delete().eq('id', id);
    onChanged();
  };

  return (
    <section className="bg-background-50 border border-background-200/70 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-foreground-900">
          <i className="ri-book-open-line mr-2 text-primary-500"></i>
          Chapitres &amp; sous-chapitres
        </h4>
        <button
          onClick={() => setShowAddChapter((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 transition-colors"
        >
          <i className="ri-add-line"></i>
          Nouveau chapitre
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {showAddChapter && (
        <div className="mb-4 p-4 border border-background-200/70 rounded-lg space-y-3">
          <input
            type="text"
            value={newChapter.titre}
            onChange={(e) => setNewChapter({ ...newChapter, titre: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') addChapter(); }}
            placeholder="Titre du chapitre (ex : Introduction)"
            className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm"
          />
          <textarea
            value={newChapter.description}
            onChange={(e) => setNewChapter({ ...newChapter, description: e.target.value })}
            rows={2}
            placeholder="Description (optionnel)"
            className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={addChapter}
              disabled={!newChapter.titre.trim()}
              className="px-5 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 disabled:opacity-50"
            >
              Ajouter
            </button>
            <button
              onClick={() => setShowAddChapter(false)}
              className="px-4 py-2 bg-background-100 rounded-full text-sm cursor-pointer whitespace-nowrap"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {chapters.length === 0 ? (
        <div className="text-center py-8 text-sm text-foreground-500">
          Aucun chapitre. Commencez par ajouter un chapitre pour structurer votre formation.
        </div>
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter, idx) => {
            const chapterLessons = lessonsForChapter(chapter.id);
            const isOpen = expanded === chapter.id;
            const draft = lessonDrafts[chapter.id] || { titre: '', contenu: '' };
            return (
              <div key={chapter.id} className="border border-background-200/70 rounded-lg overflow-hidden">
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-background-100/50 transition-colors"
                  onClick={() => toggleChapter(chapter.id)}
                >
                  <span className="w-7 h-7 rounded-full bg-secondary-100 text-secondary-900 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground-900 truncate">{chapter.titre}</p>
                    {chapter.description && (
                      <p className="text-xs text-foreground-500 truncate">{chapter.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-foreground-400 flex-shrink-0">
                    {chapterLessons.length} sous-chapitre{chapterLessons.length > 1 ? 's' : ''}
                  </span>
                  <i className={`ri-arrow-down-s-line text-foreground-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
                </div>

                {isOpen && (
                  <div className="border-t border-background-200/70 p-4 space-y-3">
                    <div className="flex justify-end">
                      <button
                        onClick={() => deleteChapter(chapter.id)}
                        className="flex items-center gap-1 text-xs text-foreground-400 hover:text-red-500 cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-delete-bin-line"></i>Supprimer le chapitre
                      </button>
                    </div>

                    {chapterLessons.map((lesson) => (
                      <div key={lesson.id} className="bg-background-100/50 border border-background-200/50 rounded-lg p-3">
                        {editLessonId === lesson.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editLessonDraft.titre}
                              onChange={(e) => setEditLessonDraft({ ...editLessonDraft, titre: e.target.value })}
                              className="w-full px-3 py-2 border border-background-200/70 rounded-lg text-sm"
                            />
                            <textarea
                              value={editLessonDraft.contenu}
                              onChange={(e) => setEditLessonDraft({ ...editLessonDraft, contenu: e.target.value })}
                              rows={4}
                              placeholder="Contenu du sous-chapitre…"
                              className="w-full px-3 py-2 border border-background-200/70 rounded-lg text-sm resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={saveEditLesson}
                                className="px-4 py-1.5 bg-primary-500 text-background-50 rounded-full text-xs font-medium cursor-pointer hover:bg-primary-600 whitespace-nowrap"
                              >
                                Enregistrer
                              </button>
                              <button
                                onClick={() => setEditLessonId(null)}
                                className="px-3 py-1.5 bg-background-100 rounded-full text-xs cursor-pointer whitespace-nowrap"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <i className="ri-file-text-line text-foreground-400 text-sm"></i>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground-800 truncate">{lesson.titre}</p>
                              {lesson.contenu && (
                                <p className="text-xs text-foreground-400 truncate">{lesson.contenu}</p>
                              )}
                            </div>
                            <button
                              onClick={() => startEditLesson(lesson)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-400 hover:text-primary-600 cursor-pointer"
                              title="Rédiger / modifier"
                            >
                              <i className="ri-edit-line text-sm"></i>
                            </button>
                            <button
                              onClick={() => deleteLesson(lesson.id)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-300 hover:text-red-500 cursor-pointer"
                              title="Supprimer"
                            >
                              <i className="ri-delete-bin-line text-sm"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="border-t border-dashed border-background-200/70 pt-3 space-y-2">
                      <p className="text-xs font-medium text-foreground-500">Ajouter un sous-chapitre</p>
                      <input
                        type="text"
                        value={draft.titre}
                        onChange={(e) => updateLessonDraft(chapter.id, { titre: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') addLesson(chapter.id); }}
                        placeholder="Titre du sous-chapitre"
                        className="w-full px-3 py-2 border border-background-200/70 rounded-lg text-sm"
                      />
                      <textarea
                        value={draft.contenu}
                        onChange={(e) => updateLessonDraft(chapter.id, { contenu: e.target.value })}
                        rows={2}
                        placeholder="Contenu (optionnel)"
                        className="w-full px-3 py-2 border border-background-200/70 rounded-lg text-sm resize-none"
                      />
                      <button
                        onClick={() => addLesson(chapter.id)}
                        disabled={!draft.titre.trim()}
                        className="px-4 py-2 bg-secondary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-secondary-600 disabled:opacity-50"
                      >
                        <i className="ri-add-line mr-1"></i>Ajouter le sous-chapitre
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}