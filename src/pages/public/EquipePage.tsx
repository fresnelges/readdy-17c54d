import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { useSectionContent } from '@/hooks/useSectionContent';

interface TeamMember {
  id: number;
  titre: string;
  description: string;
  detailssup: string | null;
  product_image: string;
  tags: string | null;
  created_at: string;
}

export default function EquipePublic() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenant, isTenant } = useTenant();
  const { before, highlight, subtitle } = useSectionContent('equipe');

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from('equipe')
      .select('*');
    
    if (isTenant && tenant) {
      query = query.eq('idcommerce', tenant.id);
    }
    
    query.order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message);
        else setMembers(data || []);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [isTenant, tenant]);

  return (
    <div className="min-h-screen bg-background-50">
      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background-100/50 to-transparent"></div>
        <div className="relative w-full px-4 md:px-6 max-w-7xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold font-heading text-foreground-950 mb-4">
            {before}
            {before && highlight ? ' ' : ''}
            {highlight && <span className="text-primary-500">{highlight}</span>}
          </h1>
          <p className="text-sm md:text-base text-foreground-500 max-w-xl mx-auto">
            {subtitle}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-8 md:py-12">
        <div className="w-full px-4 md:px-6 max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <i className="ri-error-warning-line text-4xl text-red-400 mb-3"></i>
              <p className="text-foreground-500">{error}</p>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
                <i className="ri-user-star-line text-2xl text-foreground-400"></i>
              </div>
              <p className="text-foreground-500">Aucun membre pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {members.map((member) => (
                <div key={member.id} className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-all duration-200 text-center">
                  <div className="h-48 bg-background-100 overflow-hidden">
                    <img
                      src={member.product_image || 'https://readdy.ai/api/search-image?query=Professional%20team%20member%20portrait%20with%20clean%20neutral%20background%20soft%20lighting%20corporate%20headshot%20style%20modern%20aesthetic&width=400&height=400&seq=public-team-01&orientation=squarish'}
                      alt={member.titre}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://readdy.ai/api/search-image?query=Generic%20professional%20avatar%20placeholder%20with%20soft%20gradient%20background%20clean%20minimalist%20design&width=400&height=400&seq=public-team-fallback&orientation=squarish';
                      }}
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-semibold text-foreground-900 mb-1">{member.titre}</h3>
                    {member.description && (
                      <p className="text-sm font-medium text-primary-600 mb-2">{member.description}</p>
                    )}
                    {member.tags && (
                      <div className="flex items-center justify-center gap-1.5 flex-wrap mb-3">
                        {member.tags.split(',').map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full text-xs">{tag.trim()}</span>
                        ))}
                      </div>
                    )}
                    {member.detailssup && (
                      <p className="text-xs text-foreground-400 line-clamp-3">{member.detailssup}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}