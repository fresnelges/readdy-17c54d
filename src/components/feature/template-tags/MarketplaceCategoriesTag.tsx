import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';

interface CategoryInfo {
  name: string;
  count: number;
  icon: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  'produits': 'ri-shopping-bag-line',
  'services': 'ri-briefcase-line',
  'immobilier': 'ri-building-line',
  'vehicules': 'ri-car-line',
  'emploi': 'ri-briefcase-4-line',
  'electronique': 'ri-computer-line',
  'mode': 'ri-t-shirt-line',
  'maison': 'ri-home-line',
  'loisirs': 'ri-gamepad-line',
  'alimentation': 'ri-restaurant-line',
  'sante': 'ri-heart-pulse-line',
  'education': 'ri-book-line',
};

export default function MarketplaceCategoriesTag() {
  const { tenant } = useTenant();
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;

    supabase
      .from('annonce')
      .select('type')
      .eq('publique', 1)
      .then(({ data }) => {
        if (!data) {
          setCategories([]);
          return;
        }

        const counts: Record<string, number> = {};
        data.forEach((a: { type: string }) => {
          const t = a.type?.toLowerCase() || 'autres';
          counts[t] = (counts[t] || 0) + 1;
        });

        const result: CategoryInfo[] = Object.entries(counts)
          .map(([name, count]) => ({
            name,
            count,
            icon: CATEGORY_ICONS[name] || 'ri-folder-line',
          }))
          .sort((a, b) => b.count - a.count);

        setCategories(result);
      })
      .catch(() => { /* */ })
      .finally(() => setLoading(false));
  }, [tenant?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <i className="ri-loader-4-line animate-spin text-xl text-primary-500"></i>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {categories.map((cat) => (
        <a
          key={cat.name}
          href={`/marketplace?cat=${encodeURIComponent(cat.name)}`}
          className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background-50 border border-background-200/70 hover:border-background-300/60 hover:bg-background-100/50 transition-colors cursor-pointer no-underline group"
        >
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center group-hover:bg-primary-200/70 transition-colors">
            <i className={`${cat.icon} text-lg text-primary-600`}></i>
          </div>
          <span className="text-xs font-medium text-foreground-700 capitalize text-center">{cat.name}</span>
          <span className="text-[10px] text-foreground-400">{cat.count} annonce{cat.count > 1 ? 's' : ''}</span>
        </a>
      ))}
    </div>
  );
}