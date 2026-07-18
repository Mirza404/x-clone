const SIZES = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const;

interface AvatarProps {
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
}: AvatarProps) {
  return (
    <img
      className={`${SIZES[size]} flex-shrink-0 rounded-full object-cover ${className}`}
      src={src || '/Logo.png'}
      referrerPolicy="no-referrer"
      alt={alt}
    />
  );
}
