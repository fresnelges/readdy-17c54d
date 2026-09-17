import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/lib/supabase';
import { loadPixel, trackEvent, setPixelStoreId } from '@/lib/facebookPixel';

/**
 * Charge le Facebook Pixel de la boutique et déclenche un événement
 * `PageView` à chaque navigation. S'active uniquement si le marchand a
 * configuré et activé son pixel depuis le dashboard.
 */
export default function FacebookPixel() {
  const { tenant } = useTenant();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    setReady(false);

    // Rattache les futurs événements captés à cette boutique.
    setPixelStoreId(tenant.id);

    supabase
      .from('facebook_pixel_config')
      .select('pixel_id, enabled')
      .eq('idcommerce', tenant.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data || !data.enabled || !data.pixel_id) return;
        const ok = loadPixel(data.pixel_id);
        if (ok && !cancelled) setReady(true);
      })
      .catch(() => {
        /* pixel non configuré ou erreur de lecture : on ignore */
      });

    return () => {
      cancelled = true;
    };
  }, [tenant]);

  useEffect(() => {
    if (ready) trackEvent('PageView');
  }, [ready, location.pathname]);

  return null;
}