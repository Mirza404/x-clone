'use client';

import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

type Accent = 'none' | 'blue' | 'green' | 'pink';

const ACCENT_HOVER: Record<Accent, string> = {
  none: 'hover:bg-hover hover:text-content',
  blue: 'hover:bg-primary-bg hover:text-primary',
  green: 'hover:bg-repost-bg hover:text-repost',
  pink: 'hover:bg-like-bg hover:text-like',
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  accent?: Accent;
  'aria-label': string;
  iconClassName?: string;
}

export default function IconButton({
  icon: Icon,
  accent = 'none',
  className = '',
  iconClassName = 'h-5 w-5',
  disabled,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors ${
        disabled
          ? 'pointer-events-none cursor-not-allowed opacity-50'
          : ACCENT_HOVER[accent]
      } ${className}`}
      disabled={disabled}
      {...props}
    >
      <Icon className={iconClassName} />
    </button>
  );
}
