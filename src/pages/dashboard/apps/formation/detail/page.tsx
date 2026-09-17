import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import FormationInfoCard from './components/FormationInfoCard';
import ChaptersSection from './components/ChaptersSection';
import FilesSection from './components/FilesSection';
import type { Formation, Chapter, Lesson, CourseFile } from './types';

export default function FormationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const formationId = id ? parseInt(id, 10) : NaN;

  const [formation, setFormation] = useState<Formation | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!formationId || Number.isNaN(formationId)) return;
    setLoading(true);
    try {
      const { data: f, error: ef } = await supabase
        .from('formations')
        .select('*')
        .eq('id', formationId)
        .maybeSingle();
      if (ef) throw ef;
      if (!f) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setFormation(f as Formation);

      const { data: ch, error: ech } = await supabase
        .from('chapitreformations')
        .select('*')
        .eq('id_formation', formationId)
        .order('created_at');
      if (ech) throw ech;
      setChapters(ch || []);

      const { data: ls, error: els } = await supabase
        .from('lecons')
        .select('*')
        .eq('cours_id', formationId)
        .order('ordre')
        .order('created_at');
      if (els) throw els;
      setLessons(ls || []);

      const { data: fl, error: efl } = await supabase
        .from('fichierscours')
        .select('*')
        .eq('cours_id', formationId)
        .order('created_at', { ascending: false });
      if (efl) throw efl;
      setFiles(fl || []);
    } catch (err: any) {
      console.error(err);
    }
    setLoading(false);
  }, [formationId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center py-24">
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
      </div>
    );
  }

  if (notFound || !formation) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex flex-col items-center py-24 bg-background-50 border border-background-200/70 rounded-lg">
          <i className="ri-error-warning-line text-4xl text-foreground-300 mb-3"></i>
          <p className="text-foreground-500 mb-4">Formation introuvable.</p>
          <button
            onClick={() => navigate('/dashboard/formation')}
            className="px-5 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600"
          >
            Retour aux formations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard/formation')}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-background-100 text-foreground-700 hover:bg-background-200 cursor-pointer transition-colors"
          title="Retour"
        >
          <i className="ri-arrow-left-line"></i>
        </button>
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            <i className="ri-graduation-cap-line mr-2 text-primary-500"></i>
            {formation.titre}
          </h2>
          <p className="text-sm text-foreground-500 mt-1">Détails et contenu de la formation</p>
        </div>
      </div>

      <FormationInfoCard
        formation={formation}
        userId={user?.id}
        onSaved={fetchAll}
      />

      <ChaptersSection
        formationId={formation.id}
        chapters={chapters}
        lessons={lessons}
        onChanged={fetchAll}
      />

      <FilesSection
        formationId={formation.id}
        files={files}
        onChanged={fetchAll}
      />
    </div>
  );
}