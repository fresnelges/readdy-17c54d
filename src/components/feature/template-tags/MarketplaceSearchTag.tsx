import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackSearch } from '@/lib/facebookPixel';

interface MarketplaceSearchTagProps {
  placeholder?: string;
}

export default function MarketplaceSearchTag({ placeholder }: MarketplaceSearchTagProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Suivi Meta `Search` + enregistrement dans le compteur du dashboard.
    trackSearch(query);
    navigate(
      `/marketplace?q=${encodeURIComponent(query)}${category ? `&cat=${encodeURIComponent(category)}` : ''}`,
    );
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder || 'Rechercher un produit, un service...'}
            className="w-full h-11 pl-9 pr-3 rounded-full border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 px-4 rounded-full border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 cursor-pointer"
        >
          <option value="">Toutes les catégories</option>
          <option value="produits">Produits</option>
          <option value="services">Services</option>
          <option value="immobilier">Immobilier</option>
          <option value="vehicules">Véhicules</option>
          <option value="emploi">Emploi</option>
          <option value="electronique">Électronique</option>
        </select>
        <button
          type="submit"
          className="h-11 px-6 rounded-full bg-foreground-950 text-background-50 text-sm font-semibold whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer flex items-center gap-2"
        >
          <i className="ri-search-line text-sm"></i>
          Rechercher
        </button>
      </form>
    </div>
  );
}