import type { ImgHTMLAttributes } from 'react';

const SIZES = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const;

interface AvatarProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'size'> {
  src?: string | null;
  alt: string;
  size?: keyof typeof SIZES;
  className?: string;
}

export default function Avatar({
  src,
  alt,
  size = 'md',
  className = '',
  ...props
}: AvatarProps) {
  const shared = `${SIZES[size]} flex-shrink-0 rounded-full object-cover ${className}`;

  // Rendered inline rather than fetched from `public/`, so a missing user
  // image can never turn into a 404 + broken-image icon (which is how the
  // messages list ended up showing bare alt text).
  if (!src) {
    return (
      <svg
        className={shared}
        viewBox="0 0 40 40"
        role="img"
        aria-label={alt}
        focusable="false"
      >
        <rect width="40" height="40" fill="var(--color-border-strong)" />
        <circle cx="20" cy="15" r="6.5" fill="var(--color-text-secondary)" />
        <path
          d="M6 40c0-8 6.3-13 14-13s14 5 14 13z"
          fill="var(--color-text-secondary)"
        />
      </svg>
    );
  }

  return (
    <img
      className={shared}
      src={src}
      referrerPolicy="no-referrer"
      alt={alt}
      {...props}
    />
  );
}
