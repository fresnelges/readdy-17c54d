import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackSearch } from '@/lib/facebookPixel';

interface StoreSearchBarProps {
  className?: string;
  inputClassName?: string;
  onSubmitted?: () => void;
}

/**
 * Barre de recherche publique (produits + services). Au moment de soumettre,
 * elle déclenche l'événement `Search` (Facebook Pixel) puis navigue vers la
 * page de résultats /search?q=...
 */
export default function StoreSearchBar({
  className = '',
  inputClassName = '',
  onSubmitted,
}: StoreSearchBarProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    trackSearch(q);
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setQuery('');
    onSubmitted?.();
  };

  return (
    <form onSubmit={handleSubmit} className={`relative w-full ${className}`}>
      <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm pointer-events-none"></i>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un produit, un service..."
        aria-label="Rechercher"
        className={`w-full h-9 pl-9 pr-10 rounded-full border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 ${inputClassName}`}
      />
      <button
        type="submit"
        aria-label="Lancer la recherche"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-foreground-400 hover:text-primary-600 hover:bg-background-100 transition-colors cursor-pointer"
      >
        <i className="ri-arrow-right-line text-sm"></i>
      </button>
    </form>
  );
}