import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export interface BrandInfo {
  name: string;
  logo: string | null;
}

interface BrandContextType {
  brand: BrandInfo;
  loading: boolean;
  refresh: () => void;
}

const BrandContext = createContext<BrandContextType | null>(null);

const DEFAULT_BRAND: BrandInfo = { name: 'ZIFEK', logo: null };

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<BrandInfo>(DEFAULT_BRAND);
  const [loading, setLoading] = useState(true);

  const fetchBrand = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('zifek')
        .select('title, lienimg')
        .limit(1)
        .maybeSingle();

      if (data) {
        setBrand({
          name: data.title || 'ZIFEK',
          logo: data.lienimg || null,
        });
      }
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

  return (
    <BrandContext.Provider value={{ brand, loading, refresh: fetchBrand }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand(): BrandContextType {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}