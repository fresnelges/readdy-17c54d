// Helpers de lecture du champ `media` (JSONB) des produits de la table Boutique `product_items`.

export interface ProductMediaItem {
  url: string;
  type: string;
}

/**
 * Extrait la première image d'un produit à partir de son champ `media`.
 * `media` peut arriver sous forme de tableau déjà parsé ou de chaîne JSON.
 */
export function getProductImage(media: unknown): string | null {
  if (!media) return null;

  let items: ProductMediaItem[] = [];
  if (Array.isArray(media)) {
    items = media as ProductMediaItem[];
  } else if (typeof media === 'string') {
    try {
      const parsed = JSON.parse(media);
      if (Array.isArray(parsed)) items = parsed;
    } catch {
      return null;
    }
  }

  const image = items.find((m) => m.type === 'image');
  return image?.url || items[0]?.url || null;
}