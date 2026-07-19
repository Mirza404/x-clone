'use client';

import type { LucideIcon } from 'lucide-react';

type Accent = 'blue' | 'green' | 'pink';

const ACCENT_HOVER_PAD: Record<Accent, string> = {
  blue: 'group-hover:bg-primary-bg',
  green: 'group-hover:bg-repost-bg',
  pink: 'group-hover:bg-like-bg',
};

const ACCENT_HOVER_TEXT: Record<Accent, string> = {
  blue: 'group-hover:text-primary',
  green: 'group-hover:text-repost',
  pink: 'group-hover:text-like',
};

const ACCENT_ACTIVE: Record<Accent, string> = {
  blue: 'text-primary',
  green: 'text-repost',
  pink: 'text-like',
};

interface ActionButtonProps {
  icon: LucideIcon;
  accent: Accent;
  count?: number;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  'aria-label': string;
  filled?: boolean;
}

export default function ActionButton({
  icon: Icon,
  accent,
  count = 0,
  active = false,
  onClick,
  filled = false,
  ...props
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`interactive-element group flex items-center gap-0.5 ${
        active ? ACCENT_ACTIVE[accent] : 'text-muted'
      }`}
      {...props}
    >
      <span
        className={`rounded-full p-2 transition-colors ${
          active
            ? ''
            : `${ACCENT_HOVER_PAD[accent]} ${ACCENT_HOVER_TEXT[accent]}`
        }`}
      >
        <Icon
          className="h-[18px] w-[18px]"
          fill={filled ? 'currentColor' : 'none'}
        />
      </span>
      {count > 0 && <span className="text-[13px]">{count}</span>}
    </button>
  );
}
