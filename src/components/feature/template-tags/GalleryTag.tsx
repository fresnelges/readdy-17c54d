import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';

interface GalleryItem {
  id: number;
  titre: string;
  description: string;
  product_image: string;
  tags: string | null;
  created_at: string;
}

export default function GalleryTag({ limit }: { limit?: number }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { tenant, isTenant } = useTenant();

  useEffect(() => {
    setLoading(true);
    let query = supabase.from('portfolio').select('id, titre, description, product_image, tags, created_at');

    if (isTenant && tenant) {
      query = query.eq('owner', tenant.id);
    }

    query
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) setError(fetchErr.message);
        else {
          let result = (data as GalleryItem[]) || [];
          if (limit && limit > 0) {
            result = result.slice(0, limit);
          }
          setItems(result);
        }
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [isTenant, tenant, limit]);

  const FALLBACK_IMG =
    'https://readdy.ai/api/search-image?query=Abstract%20artistic%20composition%20with%20soft%20earthy%20tones%20minimal%20geometric%20shapes%20warm%20terracotta%20and%20cream%20color%20palette%20gallery%20wall%20aesthetic%20clean%20modern%20art%20photography&width=600&height=400&seq=template-gallery-fallback&orientation=landscape';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setSelectedImage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <i className="ri-loader-4-line animate-spin text-xl text-primary-500"></i>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <i className="ri-error-warning-line text-3xl text-red-400 mb-2"></i>
        <p className="text-sm text-foreground-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-1.5 rounded-full text-xs font-medium bg-background-100 text-foreground-600 hover:bg-background-200/70 transition-colors cursor-pointer"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mb-3">
          <i className="ri-gallery-line text-xl text-foreground-400"></i>
        </div>
        <p className="text-sm text-foreground-500">Aucune image dans la galerie</p>
      </div>
    );
  }

  return (
    <>
      <div className="gallery-grid">
        {items.map((item, index) => {
          const isLarge = index === 0 || index === 3 || index === 7;
          return (
            <div
              key={item.id}
              className={`gallery-item ${isLarge ? 'gallery-item-large' : ''}`}
              onClick={() => setSelectedImage(item.product_image || FALLBACK_IMG)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedImage(item.product_image || FALLBACK_IMG);
                }
              }}
            >
              <img
                src={item.product_image || FALLBACK_IMG}
                alt={item.titre}
                className="gallery-item-img"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_IMG;
                }}
              />
              <div className="gallery-item-overlay">
                <h4 className="gallery-item-title">{item.titre}</h4>
                <p className="gallery-item-desc">{item.description}</p>
                {item.tags && (
                  <div className="gallery-item-tags">
                    {item.tags.split(',').slice(0, 3).map((tag) => (
                      <span key={tag} className="gallery-item-tag">{tag.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="gallery-lightbox"
          onClick={() => setSelectedImage(null)}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label="Visionneuse d'image"
        >
          <button
            className="gallery-lightbox-close"
            onClick={() => setSelectedImage(null)}
            aria-label="Fermer la visionneuse"
          >
            <i className="ri-close-line"></i>
          </button>
          <img
            src={selectedImage}
            alt="Agrandissement"
            className="gallery-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}