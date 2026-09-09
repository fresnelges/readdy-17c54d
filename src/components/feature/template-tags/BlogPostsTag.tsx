import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string | null;
  category: string | null;
  tags: string | null;
  status: string;
  published_at: string;
  created_at: string;
}

export default function BlogPostsTag() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenant, isTenant } = useTenant();

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from('blog_articles')
      .select('*')
      .eq('status', 'published');

    if (isTenant && tenant) {
      query = query.eq('author', tenant.id);
    }

    query
      .order('published_at', { ascending: false })
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) setError(fetchErr.message);
        else setPosts(data || []);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [isTenant, tenant]);

  const FALLBACK_IMG =
    'https://readdy.ai/api/search-image?query=Minimalist%20editorial%20photography%20with%20soft%20neutral%20gradient%20background%20clean%20modern%20aesthetic%20light%20tones&width=800&height=500&seq=template-blog-fallback&orientation=landscape';

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

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mb-3">
          <i className="ri-article-line text-xl text-foreground-400"></i>
        </div>
        <p className="text-sm text-foreground-500">Aucun article pour le moment</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {posts.map((post) => (
        <article
          key={post.id}
          className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-all duration-200"
        >
          <div className="h-44 bg-background-100 overflow-hidden">
            <img
              src={post.featured_image || FALLBACK_IMG}
              alt={post.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_IMG;
              }}
            />
          </div>
          <div className="p-4">
            {post.category && (
              <span className="text-xs font-medium text-primary-600 mb-1 block">{post.category}</span>
            )}
            <h3 className="text-sm font-semibold text-foreground-900 mb-1 line-clamp-2">{post.title}</h3>
            {post.excerpt && (
              <p className="text-xs text-foreground-500 mb-2 line-clamp-2">{post.excerpt}</p>
            )}
            {post.tags && (
              <div className="flex items-center gap-1 flex-wrap">
                {post.tags.split(',').slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full text-xs">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-foreground-400 mt-2">
              {new Date(post.published_at || post.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}