'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { Bot, MessageCircle } from 'lucide-react';
import MessagePopover from '../messages/MessagePopover';
import { useConversations } from '@/app/hooks/useConversations';

export default function FloatingActions() {
  const { status } = useSession();
  const [chatOpen, setChatOpen] = useState(false);
  const { data: conversations } = useConversations();
  const unreadCount =
    status === 'authenticated'
      ? (conversations ?? []).reduce((sum, c) => sum + c.unreadCount, 0)
      : 0;

  return (
    <div className="fixed bottom-4 right-4 z-40 hidden flex-col items-end gap-3 md:flex">
      {chatOpen && status === 'authenticated' && (
        <MessagePopover onClose={() => setChatOpen(false)} />
      )}

      <button
        type="button"
        onClick={() => toast('Coming soon')}
        aria-label="Grok"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-bg text-content shadow-lg transition-colors hover:bg-hover"
      >
        <Bot className="h-6 w-6" />
      </button>

      <button
        type="button"
        onClick={() => {
          if (status !== 'authenticated') {
            toast('Sign in to use messages');
            return;
          }
          setChatOpen((open) => !open);
        }}
        aria-label="Chat"
        className="relative flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-bg text-content shadow-lg transition-colors hover:bg-hover"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
