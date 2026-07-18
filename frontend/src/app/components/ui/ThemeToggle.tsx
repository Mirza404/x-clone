'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../utils/ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';
  const targetLabel = isDark ? 'Light mode' : 'Dark mode';
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${targetLabel}`}
      className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left text-content transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="text-[15px] font-bold">{targetLabel}</span>
    </button>
  );
}
