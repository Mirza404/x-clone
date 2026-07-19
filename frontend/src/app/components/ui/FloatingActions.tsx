'use client';

import toast from 'react-hot-toast';
import { Bot, MessageCircle } from 'lucide-react';

const ACTIONS = [
  { icon: Bot, label: 'Grok' },
  { icon: MessageCircle, label: 'Chat' },
];

export default function FloatingActions() {
  return (
    <div className="fixed bottom-4 right-4 z-40 hidden flex-col gap-3 md:flex">
      {ACTIONS.map(({ icon: Icon, label }) => (
        <button
          key={label}
          type="button"
          onClick={() => toast('Coming soon')}
          aria-label={label}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-bg text-content shadow-lg transition-colors hover:bg-hover"
        >
          <Icon className="h-6 w-6" />
        </button>
      ))}
    </div>
  );
}
