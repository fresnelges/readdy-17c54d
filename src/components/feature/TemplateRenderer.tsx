import { type ReactNode } from 'react';
import { useTenant } from '@/hooks/useTenant';
import ProductsTag from '@/components/feature/template-tags/ProductsTag';
import ServicesTag from '@/components/feature/template-tags/ServicesTag';
import BlogPostsTag from '@/components/feature/template-tags/BlogPostsTag';
import PartnersTag from '@/components/feature/template-tags/PartnersTag';
import TeamTag from '@/components/feature/template-tags/TeamTag';
import PortfolioTag from '@/components/feature/template-tags/PortfolioTag';
import ContactFormTag from '@/components/feature/template-tags/ContactFormTag';
import BookingFormTag from '@/components/feature/template-tags/BookingFormTag';
import TestimonialsTag from '@/components/feature/template-tags/TestimonialsTag';
import StatsTag from '@/components/feature/template-tags/StatsTag';
import MarketplaceProductsTag from '@/components/feature/template-tags/MarketplaceProductsTag';
import MarketplaceSellersTag from '@/components/feature/template-tags/MarketplaceSellersTag';
import MarketplaceSearchTag from '@/components/feature/template-tags/MarketplaceSearchTag';
import MarketplaceCategoriesTag from '@/components/feature/template-tags/MarketplaceCategoriesTag';
import FeaturedProductsTag from '@/components/feature/template-tags/FeaturedProductsTag';
import FaqTag from '@/components/feature/template-tags/FaqTag';
import GalleryTag from '@/components/feature/template-tags/GalleryTag';

// ── Types ────────────────────────────────────────────────────

type SegmentType = 'html' | 'tag';

interface Segment {
  type: SegmentType;
  value: string;
}

interface TagInfo {
  name: string;
  attrs: Record<string, string>;
}

// ── Parsing ──────────────────────────────────────────────────

const TEMPLATE_REGEX = /\{\{([^}]+)\}\}/g;

function parseSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TEMPLATE_REGEX.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'html', value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'tag', value: match[1].trim() });
    lastIndex = TEMPLATE_REGEX.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'html', value: content.slice(lastIndex) });
  }

  return segments;
}

function parseTag(raw: string): TagInfo {
  const parts = raw.split(/\s+/);
  const name = parts[0];
  const attrs: Record<string, string> = {};

  for (let i = 1; i < parts.length; i++) {
    const m = parts[i].match(/^(\w+)="([^"]*)"$/);
    if (m) {
      attrs[m[1]] = m[2];
    }
  }

  return { name, attrs };
}

// ── Props ────────────────────────────────────────────────────

interface TemplateRendererProps {
  content: string;
}

// ── Component ────────────────────────────────────────────────

export default function TemplateRenderer({ content }: TemplateRendererProps) {
  const { tenant, theme } = useTenant();

  const segments = parseSegments(content);
  const storeName = theme?.navTitle || tenant?.nomcommerce || tenant?.name || '';
  const storeDesc = tenant?.description || tenant?.aboutus || '';
  const storeLogo = theme?.navImage || tenant?.image;
  const storePhone = tenant?.telephone || '';
  const storeEmail = tenant?.email || '';
  const storeAddress = [tenant?.adresse, tenant?.Quartier, tenant?.Ville, tenant?.Pays].filter(Boolean).join(', ');
  const storeAbout = tenant?.aboutus || storeDesc;
  const currentYear = new Date().getFullYear();

  const renderTag = (tag: TagInfo, idx: number): ReactNode => {
    const key = `tag-${idx}`;

    // ── Site info tags (simple text replacement) ──
    switch (tag.name) {
      case 'site_name':
        return <span key={key}>{storeName}</span>;
      case 'site_description':
        return <span key={key}>{storeDesc}</span>;
      case 'site_phone':
        return <span key={key}>{storePhone}</span>;
      case 'site_email':
        return <span key={key}>{storeEmail}</span>;
      case 'site_address':
        return <span key={key}>{storeAddress}</span>;
      case 'site_about':
        return <span key={key}>{storeAbout}</span>;
      case 'year':
        return <span key={key}>{currentYear}</span>;
      case 'site_logo':
        return (
          <span key={key} className="inline-flex items-center gap-2">
            {storeLogo ? (
              <img
                src={storeLogo}
                alt={storeName}
                className="w-8 h-8 rounded-lg object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-background-50 text-sm font-bold">
                {storeName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="font-bold font-heading">{storeName}</span>
          </span>
        );

      // ── Block tags (render full components) ──
      case 'products': {
        const limit = tag.attrs.limit ? parseInt(tag.attrs.limit, 10) : undefined;
        return <ProductsTag key={key} limit={limit} />;
      }
      case 'services':
        return <ServicesTag key={key} />;
      case 'blog_posts':
        return <BlogPostsTag key={key} />;
      case 'partners':
        return <PartnersTag key={key} />;
      case 'team':
        return <TeamTag key={key} />;
      case 'portfolio':
        return <PortfolioTag key={key} />;
      case 'contact_form':
        return <ContactFormTag key={key} />;
      case 'booking_form':
        return <BookingFormTag key={key} />;
      case 'testimonials':
        return <TestimonialsTag key={key} />;
      case 'stats':
        return <StatsTag key={key} />;

      // ── Marketplace tags ──
      case 'marketplace_products': {
        const mpLimit = tag.attrs.limit ? parseInt(tag.attrs.limit, 10) : undefined;
        return <MarketplaceProductsTag key={key} limit={mpLimit} />;
      }
      case 'marketplace_sellers': {
        const msLimit = tag.attrs.limit ? parseInt(tag.attrs.limit, 10) : undefined;
        return <MarketplaceSellersTag key={key} limit={msLimit} />;
      }
      case 'marketplace_search':
        return <MarketplaceSearchTag key={key} placeholder={tag.attrs.placeholder} />;
      case 'marketplace_categories':
        return <MarketplaceCategoriesTag key={key} />;
      case 'featured_products': {
        const fpLimit = tag.attrs.limit ? parseInt(tag.attrs.limit, 10) : 6;
        return <FeaturedProductsTag key={key} limit={fpLimit} />;
      }
      case 'faq':
        return <FaqTag key={key} />;
      case 'gallery': {
        const gLimit = tag.attrs.limit ? parseInt(tag.attrs.limit, 10) : undefined;
        return <GalleryTag key={key} limit={gLimit} />;
      }

      default:
        return null;
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'html') {
          // Only render non-empty / non-whitespace HTML
          const trimmed = seg.value.trim();
          if (!trimmed) return null;
          return (
            <div
              key={`html-${i}`}
              dangerouslySetInnerHTML={{ __html: seg.value }}
            />
          );
        }
        return renderTag(parseTag(seg.value), i);
      })}
    </>
  );
}