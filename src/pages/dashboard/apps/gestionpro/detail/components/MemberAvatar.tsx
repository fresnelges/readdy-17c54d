import { useState } from 'react';

const SEAWEEDFS_PUBLIC_BASE = 'https://seaweedfs-oriq.srv1134875.hstgr.cloud/product-media/';

function resolveAvatarUrl(image: string | undefined | null): string | null {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  return `${SEAWEEDFS_PUBLIC_BASE}${image}`;
}

function avatarBg(name: string): string {
  const palette = [
    'bg-accent-100 text-accent-700',
    'bg-secondary-100 text-secondary-700',
    'bg-amber-100 text-amber-700',
    'bg-primary-100 text-primary-700',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return palette[h % palette.length];
}

interface MemberAvatarProps {
  image?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function MemberAvatar({ image, name, size = 'md' }: MemberAvatarProps) {
  const [failed, setFailed] = useState(false);
  const url = resolveAvatarUrl(image);
  const dim = size === 'sm' ? 'w-6 h-6 text-[10px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';

  if (url && !failed) {
    return (
      <div className={`${dim} rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-background-100`}>
        <img
          src={url}
          alt={name}
          className="w-full h-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${avatarBg(name)}`}>
      {initial}
    </div>
  );
}