import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';

interface TeamMember {
  id: number;
  titre: string;
  description: string;
  product_image: string;
  tags: string | null;
  created_at: string;
}

export default function TeamTag() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenant, isTenant } = useTenant();

  useEffect(() => {
    setLoading(true);
    let query = supabase.from('equipe').select('*');

    if (isTenant && tenant) {
      query = query.eq('owner', tenant.id);
    }

    query
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) setError(fetchErr.message);
        else setMembers(data || []);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [isTenant, tenant]);

  const FALLBACK_IMG =
    'https://readdy.ai/api/search-image?query=Professional%20team%20member%20portrait%20with%20clean%20neutral%20background%20soft%20lighting%20corporate%20headshot%20style%20modern%20minimalist&width=400&height=400&seq=template-team-fallback&orientation=squarish';

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
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mb-3">
          <i className="ri-user-star-line text-xl text-foreground-400"></i>
        </div>
        <p className="text-sm text-foreground-500">Aucun membre pour le moment</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {members.map((member) => (
        <div
          key={member.id}
          className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-all duration-200 text-center"
        >
          <div className="h-44 bg-background-100 overflow-hidden">
            <img
              src={member.product_image || FALLBACK_IMG}
              alt={member.titre}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_IMG;
              }}
            />
          </div>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-foreground-900 mb-1">{member.titre}</h3>
            {member.description && (
              <p className="text-xs font-medium text-primary-600 mb-2">{member.description}</p>
            )}
            {member.tags && (
              <div className="flex items-center justify-center gap-1 flex-wrap">
                {member.tags.split(',').slice(0, 4).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full text-xs">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}