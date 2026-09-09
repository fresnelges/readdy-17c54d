import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface ClosetItem {
  id: number;
  user_id: number;
  name: string;
  category: string;
  photos: string[];
  description: string;
  marque: string;
  couleur: string;
  taille: string;
  occasion: string;
}

interface Outfit {
  id: number;
  user_id: number;
  name: string;
  top_id: number | null;
  bottom_id: number | null;
  shoes_id: number | null;
  occasion: string;
  is_public: boolean;
  created_at: string;
}

const OCCASION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  casual: { label: 'Casual', icon: 'ri-t-shirt-line', color: 'bg-foreground-100 text-foreground-700' },
  travail: { label: 'Travail', icon: 'ri-briefcase-line', color: 'bg-primary-100 text-primary-700' },
  soiree: { label: 'Soirée', icon: 'ri-moon-line', color: 'bg-accent-100 text-accent-700' },
  sport: { label: 'Sport', icon: 'ri-run-line', color: 'bg-green-100 text-green-700' },
  plage: { label: 'Plage', icon: 'ri-sun-line', color: 'bg-amber-100 text-amber-700' },
  formel: { label: 'Formel', icon: 'ri-vip-crown-line', color: 'bg-purple-100 text-purple-700' },
};

export default function LookbookPage() {
  const { outfitId } = useParams<{ outfitId: string }>();

  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [closetItems, setClosetItems] = useState<Record<number, ClosetItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchOutfit = async () => {
      if (!outfitId) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const numericId = parseInt(outfitId, 10);
        if (isNaN(numericId)) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const { data: outfitData, error: outfitError } = await supabase
          .from('user_outfits')
          .select('*')
          .eq('id', numericId)
          .eq('is_public', true)
          .maybeSingle();

        if (outfitError || !outfitData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setOutfit(outfitData);

        // Collect all closet item IDs
        const itemIds: number[] = [];
        if (outfitData.top_id) itemIds.push(outfitData.top_id);
        if (outfitData.bottom_id) itemIds.push(outfitData.bottom_id);
        if (outfitData.shoes_id) itemIds.push(outfitData.shoes_id);

        if (itemIds.length > 0) {
          const { data: itemsData, error: itemsError } = await supabase
            .from('user_closet')
            .select('*')
            .in('id', itemIds);

          if (!itemsError && itemsData) {
            const itemsMap: Record<number, ClosetItem> = {};
            itemsData.forEach((item: Record<string, unknown>) => {
              const parsed = {
                ...item,
                photos: typeof item.photos === 'string' ? JSON.parse(item.photos as string) : (item.photos || []),
              } as ClosetItem;
              itemsMap[parsed.id] = parsed;
            });
            setClosetItems(itemsMap);
          }
        }
      } catch {
        setError('Une erreur est survenue lors du chargement du lookbook.');
      }
      setLoading(false);
    };

    fetchOutfit();
  }, [outfitId]);

  const top = outfit ? (outfit.top_id ? closetItems[outfit.top_id] : undefined) : undefined;
  const bottom = outfit ? (outfit.bottom_id ? closetItems[outfit.bottom_id] : undefined) : undefined;
  const shoes = outfit ? (outfit.shoes_id ? closetItems[outfit.shoes_id] : undefined) : undefined;

  const occInfo = outfit ? (OCCASION_LABELS[outfit.occasion] || OCCASION_LABELS.casual) : null;
  const date = outfit ? new Date(outfit.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) : '';

  const allItems = [top, bottom, shoes].filter(Boolean) as ClosetItem[];

  if (loading) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <i className="ri-loader-4-line animate-spin text-3xl text-accent-500"></i>
          <p className="text-sm text-foreground-500">Chargement du lookbook...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-accent-100 flex items-center justify-center mx-auto mb-5">
            <i className="ri-shirt-line text-3xl text-accent-400"></i>
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground-950 mb-2">
            Lookbook introuvable
          </h1>
          <p className="text-sm text-foreground-500 mb-6">
            Cet outfit n'existe pas ou n'est plus partagé publiquement. L'utilisateur a peut-être retiré le partage.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent-500 text-background-50 dark:text-foreground-950 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-accent-600 transition-colors"
          >
            <i className="ri-home-4-line"></i>
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  if (error || !outfit) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-red-100 flex items-center justify-center mx-auto mb-5">
            <i className="ri-error-warning-line text-3xl text-red-400"></i>
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground-950 mb-2">
            Oups !
          </h1>
          <p className="text-sm text-foreground-500 mb-6">{error || 'Erreur inconnue.'}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent-500 text-background-50 dark:text-foreground-950 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-accent-600 transition-colors"
          >
            <i className="ri-home-4-line"></i>
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-50">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-background-50/95 backdrop-blur-md border-b border-background-200/70">
        <div className="flex items-center justify-between h-14 md:h-16 px-4 md:px-6 max-w-6xl mx-auto">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm font-heading">Z</span>
            </div>
            <span className="text-lg font-bold font-heading text-foreground-950">ZIFEK</span>
          </Link>
          <span className="text-xs font-medium text-foreground-400 bg-accent-50 px-3 py-1.5 rounded-full">
            <i className="ri-eye-line mr-1"></i>
            Lookbook
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Outfit header */}
        <div className="text-center mb-8 md:mb-10">
          {occInfo && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3 ${occInfo.color}`}>
              <i className={`${occInfo.icon} text-xs`}></i>
              {occInfo.label}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-bold font-heading text-foreground-950 mb-2">
            {outfit.name}
          </h1>
          <p className="text-sm text-foreground-500">
            <i className="ri-calendar-line mr-1.5"></i>
            Créé le {date}
          </p>
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {allItems.map((item) => (
            <div key={item.id} className="flex flex-col items-center">
              {/* Photo card */}
              <div className="w-full bg-background-50 border border-background-200/70 rounded-2xl overflow-hidden mb-4">
                <div className="relative bg-background-100 w-full" style={{ paddingBottom: '120%' }}>
                  {item.photos?.[0] ? (
                    <img
                      src={item.photos[0]}
                      alt={item.name}
                      className="absolute inset-0 w-full h-full object-contain object-center p-6"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <i className="ri-image-line text-3xl text-foreground-300"></i>
                      <span className="text-xs text-foreground-400">Pas de photo</span>
                    </div>
                  )}

                  {/* Category badge */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 bg-background-50/90 backdrop-blur-sm text-foreground-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-background-200/60">
                    {item.category === 'haut' ? 'Haut' : item.category === 'milieu' ? 'Bas' : item.category === 'bas' ? 'Chaussures' : item.category}
                  </span>
                </div>
              </div>

              {/* Item details */}
              <h3 className="text-base font-bold text-foreground-900 mb-1 text-center">{item.name}</h3>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-foreground-500">
                {item.marque && (
                  <span className="flex items-center gap-1">
                    <i className="ri-store-2-line text-[10px]"></i>
                    {item.marque}
                  </span>
                )}
                {item.couleur && (
                  <span className="flex items-center gap-1">
                    <i className="ri-palette-line text-[10px]"></i>
                    {item.couleur}
                  </span>
                )}
                {item.taille && (
                  <span className="flex items-center gap-1">
                    <i className="ri-ruler-line text-[10px]"></i>
                    {item.taille}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-foreground-400 mt-2 text-center max-w-[240px] line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
          ))}

          {/* Placeholder cards for missing slots */}
          {!top && (
            <div className="flex flex-col items-center">
              <div className="relative w-full bg-background-100 border-2 border-dashed border-background-300/60 rounded-2xl overflow-hidden mb-4" style={{ paddingBottom: '120%' }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <i className="ri-t-shirt-line text-2xl text-foreground-300"></i>
                  <span className="text-xs text-foreground-400">Pas de haut</span>
                </div>
              </div>
            </div>
          )}
          {!bottom && (
            <div className="flex flex-col items-center">
              <div className="relative w-full bg-background-100 border-2 border-dashed border-background-300/60 rounded-2xl overflow-hidden mb-4" style={{ paddingBottom: '120%' }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <i className="ri-pantone-line text-2xl text-foreground-300"></i>
                  <span className="text-xs text-foreground-400">Pas de bas</span>
                </div>
              </div>
            </div>
          )}
          {!shoes && (
            <div className="flex flex-col items-center">
              <div className="relative w-full bg-background-100 border-2 border-dashed border-background-300/60 rounded-2xl overflow-hidden mb-4" style={{ paddingBottom: '120%' }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <i className="ri-footprint-line text-2xl text-foreground-300"></i>
                  <span className="text-xs text-foreground-400">Pas de chaussures</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-10 md:mt-14 pb-8">
          <p className="text-sm text-foreground-500 mb-4">
            Cet outfit a été créé avec ZIFEK — votre dressing intelligent.
          </p>
          <Link
            to="/register-client"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent-500 text-background-50 dark:text-foreground-950 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-accent-600 transition-colors"
          >
            <i className="ri-user-add-line"></i>
            Créer mon dressing
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-background-200/70 bg-background-100 py-6 px-4 text-center">
        <p className="text-xs text-foreground-400">
          Propulsé par <Link to="/" className="font-semibold text-accent-600 hover:text-accent-700 cursor-pointer">ZIFEK</Link> — Lookbook
        </p>
      </footer>
    </div>
  );
}