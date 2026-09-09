import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import LookbookExportModal from './LookbookExportModal';

interface ClosetItem {
  id: number;
  user_id: number;
  name: string;
  category: string;
  photos: string[];
  occasion: string;
  created_at: string;
}

interface Outfit {
  id: number;
  user_id: number;
  name: string;
  top_id: number | null;
  bottom_id: number | null;
  shoes_id: number | null;
  accessory_ids: number[] | null;
  occasion: string;
  is_public: boolean;
  created_at: string;
}

interface OutfitSchedule {
  id: number;
  user_id: number;
  outfit_id: number;
  day_of_week: number;
  scheduled_date: string | null;
  created_at: string;
}

type SlotType = 'top' | 'bottom' | 'shoes';

const SLOT_CONFIG: Record<SlotType, { label: string; category: string; icon: string; addLabel: string }> = {
  top: { label: 'HAUT', category: 'haut', icon: 'ri-t-shirt-line', addLabel: 'Ajouter un haut' },
  bottom: { label: 'BAS', category: 'milieu', icon: 'ri-pantone-line', addLabel: 'Ajouter un bas' },
  shoes: { label: 'CHAUSSURES', category: 'bas', icon: 'ri-footprint-line', addLabel: 'Ajouter des chaussures' },
};

const OCCASIONS = [
  { value: 'all', label: 'Toutes', icon: 'ri-apps-line' },
  { value: 'casual', label: 'Casual', icon: 'ri-t-shirt-line' },
  { value: 'travail', label: 'Travail', icon: 'ri-briefcase-line' },
  { value: 'soiree', label: 'Soirée', icon: 'ri-moon-line' },
  { value: 'sport', label: 'Sport', icon: 'ri-run-line' },
  { value: 'plage', label: 'Plage', icon: 'ri-sun-line' },
  { value: 'formel', label: 'Formel', icon: 'ri-vip-crown-line' },
];

const OCCASION_COLORS: Record<string, string> = {
  casual: 'bg-foreground-100 text-foreground-700',
  travail: 'bg-primary-100 text-primary-700',
  soiree: 'bg-foreground-200 text-foreground-900',
  sport: 'bg-accent-100/80 text-accent-800',
  plage: 'bg-secondary-100/80 text-secondary-800',
  formel: 'bg-foreground-300 text-foreground-950',
};

const DAYS = [
  { value: 0, label: 'Dim', full: 'Dimanche' },
  { value: 1, label: 'Lun', full: 'Lundi' },
  { value: 2, label: 'Mar', full: 'Mardi' },
  { value: 3, label: 'Mer', full: 'Mercredi' },
  { value: 4, label: 'Jeu', full: 'Jeudi' },
  { value: 5, label: 'Ven', full: 'Vendredi' },
  { value: 6, label: 'Sam', full: 'Samedi' },
];

function getOccasionLabel(val: string): string {
  return OCCASIONS.find((o) => o.value === val)?.label || val;
}

function toISODateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function getOccasionIcon(val: string): string {
  return OCCASIONS.find((o) => o.value === val)?.icon || 'ri-question-line';
}

export default function OutfitBuilderTab() {
  const { user } = useAuth();

  const [closetItems, setClosetItems] = useState<ClosetItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [schedules, setSchedules] = useState<OutfitSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [outfitsLoading, setOutfitsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTop, setSelectedTop] = useState<ClosetItem | null>(null);
  const [selectedBottom, setSelectedBottom] = useState<ClosetItem | null>(null);
  const [selectedShoes, setSelectedShoes] = useState<ClosetItem | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportTop, setExportTop] = useState<ClosetItem | null>(null);
  const [exportBottom, setExportBottom] = useState<ClosetItem | null>(null);
  const [exportShoes, setExportShoes] = useState<ClosetItem | null>(null);
  const [exportName, setExportName] = useState('');
  const [exportOccasion, setExportOccasion] = useState('casual');
  const [exportDate, setExportDate] = useState<string | undefined>(undefined);

  const [outfitName, setOutfitName] = useState('');
  const [outfitOccasion, setOutfitOccasion] = useState('casual');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [outfitFilter, setOutfitFilter] = useState('all');
  const [shuffling, setShuffling] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [schedulingOutfit, setSchedulingOutfit] = useState<Outfit | null>(null);
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [selectedScheduleDays, setSelectedScheduleDays] = useState<Set<number>>(new Set());
  const [wearTodayState, setWearTodayState] = useState<Record<number, 'idle' | 'loading' | 'success'>>({});
  const [duplicatingState, setDuplicatingState] = useState<Record<number, 'idle' | 'loading' | 'success'>>({});

  const [editingOutfitId, setEditingOutfitId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editOccasion, setEditOccasion] = useState('casual');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchCloset = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('user_closet')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (dbError) throw dbError;
      setClosetItems(
        (data || []).map((item) => ({
          ...item,
          photos: typeof item.photos === 'string' ? JSON.parse(item.photos) : item.photos || [],
        }))
      );
    } catch {
      setError('Impossible de charger votre armoire.');
    }
    setLoading(false);
  }, [user]);

  const fetchOutfits = useCallback(async () => {
    if (!user) return;
    setOutfitsLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('user_outfits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (dbError) throw dbError;
      setOutfits(data || []);
    } catch {
      // silent
    }
    setOutfitsLoading(false);
  }, [user]);

  const fetchSchedules = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error: dbError } = await supabase
        .from('outfit_schedule')
        .select('*')
        .eq('user_id', user.id);
      if (dbError) throw dbError;
      setSchedules(data || []);
    } catch {
      // silent
    }
  }, [user]);

  useEffect(() => {
    fetchCloset();
    fetchOutfits();
    fetchSchedules();
  }, [fetchCloset, fetchOutfits, fetchSchedules]);

  const getCategoryItems = (cat: string) => closetItems.filter((i) => i.category === cat);

  const hasSelection = selectedTop || selectedBottom || selectedShoes;

  const findClosetItem = (id: number | null): ClosetItem | undefined => {
    if (!id) return undefined;
    return closetItems.find((i) => i.id === id);
  };

  const findOutfit = (id: number): Outfit | undefined => {
    return outfits.find((o) => o.id === id);
  };

  const handleShuffle = () => {
    const tops = getCategoryItems(SLOT_CONFIG.top.category);
    const bottoms = getCategoryItems(SLOT_CONFIG.bottom.category);
    const shoesList = getCategoryItems(SLOT_CONFIG.shoes.category);

    if (tops.length === 0 && bottoms.length === 0 && shoesList.length === 0) {
      setError('Votre armoire est vide, ajoutez des vêtements pour utiliser le shuffle.');
      return;
    }

    setShuffling(true);
    setError(null);

    let tick = 0;
    const maxTicks = 12;
    const interval = setInterval(() => {
      if (tops.length) setSelectedTop(tops[Math.floor(Math.random() * tops.length)]);
      if (bottoms.length) setSelectedBottom(bottoms[Math.floor(Math.random() * bottoms.length)]);
      if (shoesList.length) setSelectedShoes(shoesList[Math.floor(Math.random() * shoesList.length)]);
      tick += 1;
      if (tick >= maxTicks) {
        clearInterval(interval);
        if (tops.length) setSelectedTop(tops[Math.floor(Math.random() * tops.length)]);
        if (bottoms.length) setSelectedBottom(bottoms[Math.floor(Math.random() * bottoms.length)]);
        if (shoesList.length) setSelectedShoes(shoesList[Math.floor(Math.random() * shoesList.length)]);
        setShuffling(false);
      }
    }, 80);
  };

  const handleSaveOutfit = async () => {
    if (!user) {
      setError('Vous devez être connecté pour sauvegarder un outfit.');
      return;
    }
    if (!selectedTop && !selectedBottom && !selectedShoes) {
      setError('Veuillez sélectionner au moins un vêtement.');
      return;
    }
    const name = outfitName.trim() || 'Mon outfit';
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const { data, error: dbError } = await supabase
        .from('user_outfits')
        .insert({
          user_id: user.id,
          name,
          top_id: selectedTop?.id ?? null,
          bottom_id: selectedBottom?.id ?? null,
          shoes_id: selectedShoes?.id ?? null,
          occasion: outfitOccasion,
        })
        .select('id')
        .single();

      if (dbError) {
        console.error('Save outfit error:', dbError);
        setError(`Erreur lors de la sauvegarde : ${dbError.message || dbError.details || 'inconnue'}`);
        setSaving(false);
        return;
      }

      if (!data) {
        setError('Erreur lors de la sauvegarde : aucune donnée retournée.');
        setSaving(false);
        return;
      }

      setSaveSuccess(true);
      setOutfitName('');
      setOutfitOccasion('casual');
      await fetchOutfits();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Save outfit exception:', msg);
      setError(`Erreur inattendue : ${msg}`);
    }
    setSaving(false);
  };

  const handleDeleteOutfit = async (id: number) => {
    if (!user) return;
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('user_outfits')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (dbError) {
        console.error('Delete outfit error:', dbError);
        setError(`Erreur suppression : ${dbError.message || dbError.details || 'inconnue'}`);
        return;
      }
      await fetchOutfits();
      await fetchSchedules();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Delete outfit exception:', msg);
      setError(`Erreur inattendue : ${msg}`);
    }
  };

  const handleTogglePublic = async (outfit: Outfit) => {
    if (!user) return;
    setError(null);
    const newPublic = !outfit.is_public;
    try {
      const { error: dbError } = await supabase
        .from('user_outfits')
        .update({ is_public: newPublic })
        .eq('id', outfit.id)
        .eq('user_id', user.id);

      if (dbError) {
        setError(`Erreur partage : ${dbError.message || dbError.details || 'inconnue'}`);
        return;
      }

      if (newPublic) {
        const shareUrl = `${window.location.origin}/lookbook/${outfit.id}`;
        try {
          await navigator.clipboard.writeText(shareUrl);
          setShareToast(true);
          setTimeout(() => setShareToast(false), 3500);
        } catch {
          // Clipboard failed silently
        }
      }

      setOutfits((prev) =>
        prev.map((o) => (o.id === outfit.id ? { ...o, is_public: newPublic } : o))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Erreur inattendue : ${msg}`);
    }
  };

  const handleScheduleOutfit = async (outfitId: number, dayOfWeek: number) => {
    if (!user) return;
    setSchedulingLoading(true);
    setError(null);
    try {
      const monday = getMondayOfWeek(new Date());
      monday.setDate(monday.getDate() + dayOfWeek);
      const scheduledDate = toISODateStr(monday);

      await supabase
        .from('outfit_schedule')
        .delete()
        .eq('user_id', user.id)
        .eq('scheduled_date', scheduledDate);

      const { error: dbError } = await supabase
        .from('outfit_schedule')
        .insert({
          user_id: user.id,
          outfit_id: outfitId,
          day_of_week: dayOfWeek,
          scheduled_date: scheduledDate,
        });

      if (dbError) {
        console.error('Schedule error:', dbError);
        setError(`Erreur planning : ${dbError.message || dbError.details || 'inconnue'}`);
        setSchedulingLoading(false);
        return;
      }
      await fetchSchedules();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Erreur inattendue : ${msg}`);
    }
    setSchedulingLoading(false);
  };

  const handleScheduleMultipleOutfit = async (outfitId: number, days: number[]) => {
    if (!user || days.length === 0) return;
    setSchedulingLoading(true);
    setError(null);
    try {
      const monday = getMondayOfWeek(new Date());
      await Promise.all(days.map(async (dayOfWeek) => {
        const date = new Date(monday);
        date.setDate(date.getDate() + dayOfWeek);
        const scheduledDate = toISODateStr(date);
        await supabase
          .from('outfit_schedule')
          .delete()
          .eq('user_id', user.id)
          .eq('scheduled_date', scheduledDate);
        await supabase
          .from('outfit_schedule')
          .insert({
            user_id: user.id,
            outfit_id: outfitId,
            day_of_week: dayOfWeek,
            scheduled_date: scheduledDate,
          });
      }));
      await fetchSchedules();
      setScheduleModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Erreur planning : ${msg}`);
    }
    setSchedulingLoading(false);
  };

  const handleWearToday = async (outfitId: number) => {
    if (!user) return;
    const todayStr = toISODateStr(new Date());
    const todayDayOfWeek = new Date().getDay();

    setWearTodayState((prev) => ({ ...prev, [outfitId]: 'loading' }));
    setError(null);

    try {
      await supabase
        .from('outfit_schedule')
        .delete()
        .eq('user_id', user.id)
        .eq('scheduled_date', todayStr);

      const { error: dbError } = await supabase
        .from('outfit_schedule')
        .insert({
          user_id: user.id,
          outfit_id: outfitId,
          day_of_week: todayDayOfWeek,
          scheduled_date: todayStr,
        });

      if (dbError) throw dbError;

      await fetchSchedules();
      setWearTodayState((prev) => ({ ...prev, [outfitId]: 'success' }));

      setTimeout(() => {
        setWearTodayState((prev) => {
          const next = { ...prev };
          delete next[outfitId];
          return next;
        });
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Erreur : ${msg}`);
      setWearTodayState((prev) => {
        const next = { ...prev };
        delete next[outfitId];
        return next;
      });
    }
  };

  const handleDuplicateOutfit = async (outfit: Outfit) => {
    if (!user) return;

    setDuplicatingState((prev) => ({ ...prev, [outfit.id]: 'loading' }));
    setError(null);

    try {
      const baseName = outfit.name.replace(/\s*\(copie\)\s*$/i, '').trim();
      const newName = `${baseName} (copie)`;

      const { error: dbError } = await supabase
        .from('user_outfits')
        .insert({
          user_id: user.id,
          name: newName,
          top_id: outfit.top_id,
          bottom_id: outfit.bottom_id,
          shoes_id: outfit.shoes_id,
          accessory_ids: outfit.accessory_ids ?? null,
          occasion: outfit.occasion,
          is_public: false,
        });

      if (dbError) {
        console.error('Duplicate outfit error:', dbError);
        setError(`Erreur duplication : ${dbError.message || dbError.details || 'inconnue'}`);
        setDuplicatingState((prev) => {
          const next = { ...prev };
          delete next[outfit.id];
          return next;
        });
        return;
      }

      await fetchOutfits();
      setDuplicatingState((prev) => ({ ...prev, [outfit.id]: 'success' }));

      setTimeout(() => {
        setDuplicatingState((prev) => {
          const next = { ...prev };
          delete next[outfit.id];
          return next;
        });
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Duplicate outfit exception:', msg);
      setError(`Erreur inattendue : ${msg}`);
      setDuplicatingState((prev) => {
        const next = { ...prev };
        delete next[outfit.id];
        return next;
      });
    }
  };

  const handleStartEdit = (outfit: Outfit) => {
    setEditingOutfitId(outfit.id);
    setEditName(outfit.name);
    setEditOccasion(outfit.occasion);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingOutfitId(null);
    setEditName('');
    setEditOccasion('casual');
    setEditError(null);
  };

  const handleSaveEdit = async (outfitId: number) => {
    if (!user) return;
    const name = editName.trim();
    if (!name) {
      setEditError('Le nom ne peut pas être vide.');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const { error: dbError } = await supabase
        .from('user_outfits')
        .update({ name, occasion: editOccasion })
        .eq('id', outfitId)
        .eq('user_id', user.id);

      if (dbError) {
        setEditError(dbError.message || 'Erreur lors de la modification.');
        setEditSaving(false);
        return;
      }

      setOutfits((prev) =>
        prev.map((o) => (o.id === outfitId ? { ...o, name, occasion: editOccasion } : o))
      );
      handleCancelEdit();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setEditError(`Erreur : ${msg}`);
    }
    setEditSaving(false);
  };

  const openScheduleModal = (outfit: Outfit) => {
    const alreadyScheduledDays = new Set(
      schedules
        .filter((s) => s.outfit_id === outfit.id && s.scheduled_date)
        .map((s) => s.day_of_week)
    );
    setSelectedScheduleDays(alreadyScheduledDays);
    setSchedulingOutfit(outfit);
    setScheduleModalOpen(true);
  };

  const openExportBuilder = () => {
    setExportTop(selectedTop);
    setExportBottom(selectedBottom);
    setExportShoes(selectedShoes);
    setExportName(outfitName);
    setExportOccasion(outfitOccasion);
    setExportDate(undefined);
    setExportOpen(true);
  };

  const openExportSaved = (outfit: Outfit) => {
    setExportTop(findClosetItem(outfit.top_id) ?? null);
    setExportBottom(findClosetItem(outfit.bottom_id) ?? null);
    setExportShoes(findClosetItem(outfit.shoes_id) ?? null);
    setExportName(outfit.name);
    setExportOccasion(outfit.occasion);
    setExportDate(outfit.created_at);
    setExportOpen(true);
  };

  const filteredOutfits = outfitFilter === 'all'
    ? outfits
    : outfits.filter((o) => o.occasion === outfitFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="ri-loader-4-line animate-spin text-2xl text-foreground-400"></i>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            <i className="ri-shirt-line mr-2 text-foreground-700"></i>
            Mon Dressing
          </h2>
          <p className="text-sm text-foreground-500 mt-1">
            Glissez et composez vos tenues
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/mon-planning"
            className="flex items-center gap-2 px-5 py-2.5 bg-secondary-500 text-background-50 dark:text-foreground-950 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-secondary-600 transition-colors"
          >
            <i className="ri-calendar-line"></i>
            Planning semaine
          </Link>
          {hasSelection && (
            <>
              <button
                onClick={() => setPreviewOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-foreground-900 text-background-50 dark:text-foreground-950 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-foreground-800 transition-colors"
              >
                <i className="ri-eye-line"></i>
                Voir mon outfit
              </button>
              <button
                onClick={openExportBuilder}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-background-50 dark:text-foreground-950 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 transition-colors"
              >
                <i className="ri-download-line"></i>
                Exporter
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 text-sm rounded-lg mb-4">
          <i className="ri-error-warning-line"></i>
          {error}
          <button onClick={() => setError(null)} className="ml-auto cursor-pointer hover:text-red-900">
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      {/* ─── Carousel Mode ─── */}
      <>
        {/* Shuffle bar */}
        <div className="flex justify-center mb-3">
          <button
            onClick={handleShuffle}
            disabled={shuffling || closetItems.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-secondary-500 text-background-50 dark:text-foreground-950 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-secondary-600 disabled:opacity-50 transition-colors"
          >
            {shuffling ? (
              <>
                <i className="ri-loader-4-line animate-spin"></i>
                Génération...
              </>
            ) : (
              <>
                <i className="ri-shuffle-line"></i>
                Outfit surprise
              </>
            )}
          </button>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-foreground-100/70 text-foreground-700 text-sm rounded-lg mb-4">
            <i className="ri-check-line"></i>
            Outfit sauvegardé avec succès !
          </div>
        )}

        {shareToast && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-foreground-100/70 text-foreground-700 text-sm rounded-lg mb-4">
            <i className="ri-link text-foreground-600"></i>
            Lien du lookbook copié dans le presse-papier ! Partage-le avec qui tu veux.
          </div>
        )}

        {/* Builder — 3 horizontal carousels */}
        <div className="bg-background-50 border border-background-200/30 rounded-xl p-3 md:p-4 mb-8">
          <div className="space-y-1.5">
            <ClosetCarousel
              slot="top"
              items={getCategoryItems(SLOT_CONFIG.top.category)}
              selected={selectedTop}
              onSelect={setSelectedTop}
              shuffling={shuffling}
            />

            <ClosetCarousel
              slot="bottom"
              items={getCategoryItems(SLOT_CONFIG.bottom.category)}
              selected={selectedBottom}
              onSelect={setSelectedBottom}
              shuffling={shuffling}
            />

            <ClosetCarousel
              slot="shoes"
              items={getCategoryItems(SLOT_CONFIG.shoes.category)}
              selected={selectedShoes}
              onSelect={setSelectedShoes}
              shuffling={shuffling}
            />
          </div>

          {/* Save section — always visible when closet has items */}
          {closetItems.length > 0 && (
            <div className="mt-3 pt-3 border-t border-background-200/30">
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <input
                  type="text"
                  value={outfitName}
                  onChange={(e) => setOutfitName(e.target.value)}
                  placeholder="Nommez votre outfit"
                  className="flex-1 px-3 py-2 bg-background-50 border border-background-200/30 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-foreground-300"
                  maxLength={60}
                />
                <button
                  onClick={handleSaveOutfit}
                  disabled={saving || !hasSelection}
                  className="px-4 py-2 bg-primary-500 text-background-50 dark:text-foreground-950 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 justify-center"
                >
                  {saving ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <i className="ri-save-line"></i>
                      Sauvegarder
                    </>
                  )}
                </button>
              </div>
              {!hasSelection && (
                <p className="text-[11px] text-foreground-400 mt-2 text-center">
                  Utilisez les flèches ou cliquez sur un vêtement pour le sélectionner
                </p>
              )}
            </div>
          )}
        </div>
      </>

      {/* Saved Outfits */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold font-heading text-foreground-950">
            <i className="ri-folder-zip-line mr-2 text-secondary-500"></i>
            Mes outfits sauvegardés
          </h3>

          <div className="flex flex-wrap gap-1.5">
            {OCCASIONS.map((occ) => (
              <button
                key={occ.value}
                onClick={() => setOutfitFilter(occ.value)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  outfitFilter === occ.value
                    ? 'bg-foreground-100/70 text-foreground-900 border border-foreground-200'
                    : 'bg-background-50 border border-background-200/30 text-foreground-500 hover:bg-background-100'
                }`}
              >
                {occ.label}
              </button>
            ))}
          </div>
        </div>

        {outfitsLoading ? (
          <div className="flex items-center justify-center py-10">
            <i className="ri-loader-4-line animate-spin text-xl text-foreground-400"></i>
          </div>
        ) : filteredOutfits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-background-50 border border-background-200/30 rounded-xl">
            <div className="w-14 h-14 rounded-2xl bg-foreground-100 flex items-center justify-center mb-3">
            <i className="ri-shirt-line text-xl text-foreground-500"></i>
            </div>
            <p className="text-foreground-600 text-sm font-medium">
              {outfitFilter !== 'all' ? `Aucun outfit ${getOccasionLabel(outfitFilter)}` : 'Aucun outfit sauvegardé'}
            </p>
            <p className="text-foreground-400 text-xs mt-1 text-center max-w-xs">
              Composez une tenue ci-dessus et sauvegardez-la pour la retrouver ici.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOutfits.map((outfit, index) => {
              const top = findClosetItem(outfit.top_id);
              const bottom = findClosetItem(outfit.bottom_id);
              const shoes = findClosetItem(outfit.shoes_id);
              const occBadge = OCCASION_COLORS[outfit.occasion] || 'bg-background-100 text-foreground-600';
              const scheduledDays = schedules
                .filter((s) => s.outfit_id === outfit.id && s.scheduled_date)
                .map((s) => s.scheduled_date!);
              const isEditing = editingOutfitId === outfit.id;

              return (
                <div key={outfit.id} className="bg-background-50 border border-background-200/30 rounded-xl p-4 hover:border-foreground-200/50 transition-colors animate-card-in" style={{ animationDelay: `${index * 60}ms` }}>
                  {/* Editable header row */}
                  {isEditing ? (
                    <div className="mb-3 space-y-2.5">
                      {editError && (
                        <div className="flex items-center gap-1.5 text-[11px] text-red-600">
                          <i className="ri-error-warning-line"></i>
                          {editError}
                        </div>
                      )}
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => { setEditName(e.target.value); setEditError(null); }}
                        className="w-full px-3 py-1.5 bg-background-50 border border-foreground-300 rounded-lg text-sm font-semibold text-foreground-900 focus:outline-none focus:border-foreground-400"
                        placeholder="Nom de l'outfit"
                        maxLength={60}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(outfit.id); if (e.key === 'Escape') handleCancelEdit(); }}
                        autoFocus
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        {OCCASIONS.filter((o) => o.value !== 'all').map((occ) => {
                          const occColor = OCCASION_COLORS[occ.value] || 'bg-background-100 text-foreground-600';
                          const isSelected = editOccasion === occ.value;
                          return (
                            <button
                              key={occ.value}
                              onClick={() => setEditOccasion(occ.value)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                                isSelected
                                  ? `${occColor} ring-2 ring-offset-1 ring-foreground-400`
                                  : 'bg-background-100 text-foreground-400 hover:bg-background-200'
                              }`}
                            >
                              <i className={`${occ.icon} text-[10px]`}></i>
                              {occ.label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleSaveEdit(outfit.id)}
                          disabled={editSaving}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-foreground-900 text-background-50 dark:text-foreground-950 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer hover:bg-foreground-800 disabled:opacity-50 transition-colors"
                        >
                          {editSaving ? (
                            <>
                              <i className="ri-loader-4-line animate-spin"></i>
                              Enregistrement...
                            </>
                          ) : (
                            <>
                              <i className="ri-check-line"></i>
                              Enregistrer
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={editSaving}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-background-100 text-foreground-600 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer hover:bg-background-200 disabled:opacity-40 transition-colors"
                        >
                          <i className="ri-close-line"></i>
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground-800 truncate">{outfit.name}</h4>
                        <span className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${occBadge}`}>
                          <i className={`${getOccasionIcon(outfit.occasion)} text-[10px]`}></i>
                          {getOccasionLabel(outfit.occasion)}
                        </span>
                        {outfit.is_public && (
                          <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-foreground-100/70 text-foreground-700">
                            <i className="ri-earth-line text-[10px]"></i>
                            Public
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTogglePublic(outfit)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                            outfit.is_public
                              ? 'text-foreground-600 bg-foreground-100 hover:bg-foreground-200/70'
                              : 'text-foreground-400 hover:bg-foreground-100 hover:text-foreground-600'
                          }`}
                          title={outfit.is_public ? 'Lien copié — Ne plus partager' : 'Partager le lookbook'}
                        >
                          <i className={`${outfit.is_public ? 'ri-link' : 'ri-share-line'} text-xs`}></i>
                        </button>
                        <button
                          onClick={() => openScheduleModal(outfit)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-400 hover:bg-secondary-50 hover:text-secondary-600 cursor-pointer transition-colors"
                          title="Programmer dans le planning"
                        >
                          <i className="ri-calendar-event-line text-xs"></i>
                        </button>
                        <button
                          onClick={() => openExportSaved(outfit)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-400 hover:bg-foreground-100 hover:text-foreground-600 cursor-pointer transition-colors"
                          title="Exporter en image"
                        >
                          <i className="ri-download-line text-xs"></i>
                        </button>
                        <button
                          onClick={() => handleStartEdit(outfit)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-400 hover:bg-foreground-100 hover:text-foreground-600 cursor-pointer transition-colors"
                          title="Modifier le nom ou l'occasion"
                        >
                          <i className="ri-edit-line text-xs"></i>
                        </button>
                        {(() => {
                          const dupState = duplicatingState[outfit.id] || 'idle';
                          if (dupState === 'loading') {
                            return (
                              <span className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-300">
                                <i className="ri-loader-4-line animate-spin text-xs"></i>
                              </span>
                            );
                          }
                          if (dupState === 'success') {
                            return (
                              <span className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-600 bg-foreground-100">
                                <i className="ri-check-line text-xs"></i>
                              </span>
                            );
                          }
                          return (
                            <button
                              onClick={() => handleDuplicateOutfit(outfit)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-400 hover:bg-secondary-50 hover:text-secondary-600 cursor-pointer transition-colors"
                              title="Dupliquer l'outfit"
                            >
                              <i className="ri-file-copy-line text-xs"></i>
                            </button>
                          );
                        })()}
                        <button
                          onClick={() => handleDeleteOutfit(outfit.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
                        >
                          <i className="ri-delete-bin-line text-xs"></i>
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {top && top.photos?.[0] && (
                      <img
                        src={top.photos[0]}
                        alt={top.name}
                        className="w-16 h-16 rounded-lg object-cover object-top bg-background-100 border border-background-200/30"
                      />
                    )}
                    {bottom && bottom.photos?.[0] && (
                      <img
                        src={bottom.photos[0]}
                        alt={bottom.name}
                        className="w-16 h-16 rounded-lg object-cover object-top bg-background-100 border border-background-200/30"
                      />
                    )}
                    {shoes && shoes.photos?.[0] && (
                      <img
                        src={shoes.photos[0]}
                        alt={shoes.name}
                        className="w-16 h-16 rounded-lg object-cover object-top bg-background-100 border border-background-200/30"
                      />
                    )}
                    {!top && !bottom && !shoes && (
                      <p className="text-xs text-foreground-400">Aucun vêtement</p>
                    )}
                  </div>
                  {/* Bouton Porter aujourd'hui */}
                  {(() => {
                    const dateAujourdhui = toISODateStr(new Date());
                    const estDejaProgramme = scheduledDays.includes(dateAujourdhui);
                    const wearState = wearTodayState[outfit.id] || 'idle';

                    if (estDejaProgramme) {
                      return (
                        <div className="mt-2.5 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-foreground-100/70 border border-foreground-200/40 text-foreground-700 text-xs font-medium">
                          <i className="ri-check-double-line"></i>
                          Port&eacute; aujourd&apos;hui
                        </div>
                      );
                    }

                    return (
                      <div className="mt-2.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleWearToday(outfit.id); }}
                          disabled={wearState === 'loading'}
                          className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                            wearState === 'loading'
                              ? 'bg-background-100 text-foreground-400'
                              : wearState === 'success'
                              ? 'bg-foreground-100/70 border border-foreground-200/40 text-foreground-700'
                              : 'bg-foreground-100 border border-foreground-200/40 text-foreground-700 hover:bg-foreground-200/70 hover:border-foreground-300'
                          }`}
                        >
                          {wearState === 'loading' ? (
                            <>
                              <i className="ri-loader-4-line animate-spin"></i>
                              Programmation...
                            </>
                          ) : wearState === 'success' ? (
                            <>
                              <i className="ri-check-line"></i>
                              Programm&eacute;e pour aujourd&apos;hui !
                            </>
                          ) : (
                            <>
                              <i className="ri-calendar-check-line"></i>
                              Porter aujourd&apos;hui
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between mt-2.5">
                    <p className="text-[10px] text-foreground-400">
                      {new Date(outfit.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    {scheduledDays.length > 0 && (
                      <div className="flex items-center gap-1">
                        {scheduledDays.slice(0, 3).map((d) => {
                          const date = new Date(d + 'T00:00:00');
                          const label = `${DAYS[date.getDay()].label} ${date.getDate()}/${date.getMonth() + 1}`;
                          return (
                            <span key={d} className="px-1.5 py-0.5 rounded-full bg-secondary-100 text-secondary-700 text-[9px] font-medium">
                              {label}
                            </span>
                          );
                        })}
                        {scheduledDays.length > 3 && (
                          <span className="text-[9px] text-foreground-400">+{scheduledDays.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPreviewOpen(false)}>
          <div
            className="bg-background-50 rounded-xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-background-200/30 flex items-center justify-between">
              <h3 className="text-base font-bold font-heading text-foreground-950">Mon outfit</h3>
              <button
                onClick={() => setPreviewOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-background-100"
              >
                <i className="ri-close-line text-foreground-500"></i>
              </button>
            </div>
            <div className="p-5 flex flex-col items-center gap-4">
              {selectedTop && selectedTop.photos?.[0] && (
                <div className="relative w-full max-w-[200px]">
                  <img src={selectedTop.photos[0]} alt={selectedTop.name} className="w-full rounded-lg object-contain" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-foreground-900 text-background-50 text-[10px] font-medium rounded-full">HAUT</span>
                </div>
              )}
              {selectedBottom && selectedBottom.photos?.[0] && (
                <div className="relative w-full max-w-[200px]">
                  <img src={selectedBottom.photos[0]} alt={selectedBottom.name} className="w-full rounded-lg object-contain" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-primary-500 text-background-50 text-[10px] font-medium rounded-full">BAS</span>
                </div>
              )}
              {selectedShoes && selectedShoes.photos?.[0] && (
                <div className="relative w-full max-w-[200px]">
                  <img src={selectedShoes.photos[0]} alt={selectedShoes.name} className="w-full rounded-lg object-contain" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-secondary-500 text-background-50 text-[10px] font-medium rounded-full">CHAUSSURES</span>
                </div>
              )}
              {!selectedTop && !selectedBottom && !selectedShoes && (
                <p className="text-sm text-foreground-500">Aucun vêtement sélectionné</p>
              )}
            </div>
            <div className="px-5 py-4 border-t border-background-200/30">
              <button
                onClick={() => { setPreviewOpen(false); }}
                className="w-full px-5 py-2.5 bg-foreground-900 text-background-50 dark:text-foreground-950 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-foreground-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModalOpen && schedulingOutfit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setScheduleModalOpen(false)}>
          <div
            className="bg-background-50 rounded-xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-background-200/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="ri-calendar-event-line text-secondary-500"></i>
                <h3 className="text-base font-bold font-heading text-foreground-950">Programmer l&apos;outfit</h3>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-background-100"
              >
                <i className="ri-close-line text-foreground-500"></i>
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm text-foreground-700 mb-1">
                <strong className="text-foreground-900">{schedulingOutfit.name}</strong>
              </p>
              <p className="text-xs text-foreground-400 mb-4">
                Sélectionne un ou plusieurs jours, puis clique sur Programmer.
              </p>

              <div className="grid grid-cols-7 gap-2 mb-4">
                {DAYS.map((day) => {
                  const monday = getMondayOfWeek(new Date());
                  monday.setDate(monday.getDate() + day.value);
                  const dateStr = toISODateStr(monday);
                  const existingSched = schedules.find((s) => s.scheduled_date === dateStr);
                  const isCurrentOutfit = existingSched?.outfit_id === schedulingOutfit.id;
                  const hasOtherOutfit = existingSched && !isCurrentOutfit;
                  const otherOutfit = hasOtherOutfit ? findOutfit(existingSched!.outfit_id) : null;
                  const dayDate = monday.getDate();
                  const isSelected = selectedScheduleDays.has(day.value);

                  return (
                    <button
                      key={day.value}
                      onClick={() => {
                        setSelectedScheduleDays((prev) => {
                          const next = new Set(prev);
                          if (next.has(day.value)) {
                            next.delete(day.value);
                          } else {
                            next.add(day.value);
                          }
                          return next;
                        });
                      }}
                      className={`relative rounded-xl p-2 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-secondary-500 text-background-50 border border-secondary-500 shadow-sm'
                          : hasOtherOutfit
                          ? 'bg-foreground-100/70 border border-foreground-200 hover:bg-secondary-50 hover:border-secondary-300'
                          : 'bg-background-100 border border-background-200/60 hover:bg-secondary-50 hover:border-secondary-300'
                      }`}
                    >
                      <span className={`text-[10px] font-bold ${isSelected ? 'text-background-50' : hasOtherOutfit ? 'text-foreground-700' : 'text-foreground-600'}`}>
                        {day.label} {dayDate}
                      </span>
                      {isSelected ? (
                        <i className="ri-check-line text-sm"></i>
                      ) : hasOtherOutfit ? (
                        <span className="text-[9px] text-foreground-700 text-center leading-tight truncate max-w-full">
                          {otherOutfit?.name ? otherOutfit.name.substring(0, 10) : 'Occupé'}
                        </span>
                      ) : (
                        <span className="text-[9px] text-foreground-300 text-center">Libre</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {schedulingLoading && (
                <div className="flex items-center justify-center gap-2 text-sm text-foreground-500 mb-3">
                  <i className="ri-loader-4-line animate-spin"></i>
                  Programmation en cours...
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-foreground-400 mb-4 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-secondary-500 inline-block"></span>
                  Sélectionné
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-foreground-200 inline-block"></span>
                  Déjà occupé
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-background-100 border border-background-200/60 inline-block"></span>
                  Libre
                </span>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-background-200/30 flex gap-2">
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="flex-1 px-5 py-2.5 bg-background-100 text-foreground-700 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-background-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  const daysArray = Array.from(selectedScheduleDays);
                  handleScheduleMultipleOutfit(schedulingOutfit.id, daysArray);
                }}
                disabled={schedulingLoading || selectedScheduleDays.size === 0}
                className="flex-1 px-5 py-2.5 bg-secondary-500 text-background-50 dark:text-foreground-950 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-secondary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
              >
                <i className="ri-calendar-check-line"></i>
                Programmer {selectedScheduleDays.size > 0 ? `${selectedScheduleDays.size} jour${selectedScheduleDays.size > 1 ? 's' : ''}` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <LookbookExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        outfitName={exportName}
        occasion={exportOccasion}
        top={exportTop}
        bottom={exportBottom}
        shoes={exportShoes}
        createdAt={exportDate}
      />
    </div>
  );
}

/* ─── ClosetCarousel sub-component ─── */
function ClosetCarousel({
  slot,
  items,
  selected,
  onSelect,
  shuffling,
}: {
  slot: SlotType;
  items: ClosetItem[];
  selected: ClosetItem | null;
  onSelect: (item: ClosetItem) => void;
  shuffling: boolean;
}) {
  const icon = SLOT_CONFIG[slot].icon;

  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (!selected) return;
    const idx = items.findIndex((i) => i.id === selected.id);
    if (idx !== -1) setCurrentIndex(idx);
  }, [selected, items]);

  useEffect(() => {
    if (currentIndex >= items.length) {
      setCurrentIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, currentIndex]);

  const goPrev = () => {
    const newIdx = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
    setCurrentIndex(newIdx);
    if (items[newIdx]) onSelect(items[newIdx]);
  };
  const goNext = () => {
    const newIdx = currentIndex >= items.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(newIdx);
    if (items[newIdx]) onSelect(items[newIdx]);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        goPrev();
      } else {
        goNext();
      }
    }
  };

  const currentItem = items.length > 0 ? items[currentIndex] : null;
  const isSelected = currentItem && selected?.id === currentItem.id;

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 px-3 bg-background-100/60 rounded-xl border border-dashed border-background-300/60">
        <div className="w-8 h-8 rounded-full bg-foreground-100 flex items-center justify-center shrink-0">
          <i className={`${icon} text-xs text-foreground-500`}></i>
        </div>
        <div>
          <p className="text-xs font-medium text-foreground-600">{SLOT_CONFIG[slot].label}</p>
          <p className="text-[10px] text-foreground-400">{SLOT_CONFIG[slot].addLabel} dans Mon Armoire</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 md:gap-2">
        <button
          onClick={goPrev}
          className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-background-100 hover:bg-foreground-100 text-foreground-400 hover:text-foreground-600 flex items-center justify-center shrink-0 cursor-pointer transition-colors border border-background-200/60"
          aria-label="Article précédent"
        >
          <i className="ri-arrow-left-s-line text-base md:text-lg"></i>
        </button>

        <button
          onClick={() => currentItem && onSelect(currentItem)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`relative flex-1 rounded-xl overflow-hidden transition-all cursor-pointer ${
            isSelected
              ? 'ring-2 ring-foreground-900 shadow-md'
              : 'ring-1 ring-background-200/50 hover:ring-background-300'
          }`}
        >
          <div className="relative bg-background-100 h-32 md:h-40">
            {currentItem?.photos?.[0] ? (
              <img
                src={currentItem.photos[0]}
                alt={currentItem.name}
                className="w-full h-full object-contain object-center p-2"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <i className={`${icon} text-2xl text-foreground-300`} />
              </div>
            )}
            {currentItem?.occasion && currentItem.occasion !== 'casual' && (
              <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${OCCASION_COLORS[currentItem.occasion] || 'bg-background-50/90 text-foreground-600'}`}>
                {getOccasionLabel(currentItem.occasion)}
              </span>
            )}
            {isSelected && (
              <div className="absolute inset-0 bg-foreground-900/10 pointer-events-none" />
            )}
          </div>
        </button>

        <button
          onClick={goNext}
          className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-background-100 hover:bg-foreground-100 text-foreground-400 hover:text-foreground-600 flex items-center justify-center shrink-0 cursor-pointer transition-colors border border-background-200/60"
          aria-label="Article suivant"
        >
          <i className="ri-arrow-right-s-line text-base md:text-lg"></i>
        </button>
      </div>

      <div className="flex items-center justify-between mt-1 px-1">
        <p className={`text-[11px] font-medium truncate ${isSelected ? 'text-foreground-800' : 'text-foreground-600'}`}>
          {currentItem?.name || ''}
        </p>
        <div className="flex items-center gap-0.5 shrink-0 ml-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`rounded-full cursor-pointer transition-all ${
                idx === currentIndex
                  ? 'bg-foreground-900 w-2.5 h-1.5'
                  : 'bg-background-300 hover:bg-background-400 w-1.5 h-1.5'
              }`}
              aria-label={`Aller à l'article ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}