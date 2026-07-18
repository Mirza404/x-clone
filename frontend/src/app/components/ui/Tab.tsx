import type { ReactNode } from 'react';

interface TabProps {
  label: string;
  isActive: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
}

export default function Tab({ label, isActive, onClick, trailing }: TabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={`post-hover relative flex flex-1 items-center justify-center gap-1 py-4 text-center text-[15px] ${
        isActive ? 'font-bold text-content' : 'font-normal text-muted'
      }`}
    >
      {label}
      {trailing}
      {isActive && (
        <span className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-primary" />
      )}
    </button>
  );
}
