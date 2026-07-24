'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, X } from 'lucide-react';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import { useConversations } from '@/app/hooks/useConversations';

interface MessagePopoverProps {
  onClose: () => void;
}

export default function MessagePopover({ onClose }: MessagePopoverProps) {
  const { data: conversations, isLoading, isError } = useConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = conversations?.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-border-strong bg-bg shadow-2xl">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          {selected && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Back to conversations"
              className="rounded-full p-1 hover:bg-hover"
            >
              <ArrowLeft className="h-4 w-4 text-content" />
            </button>
          )}
          <Link
            href="/messages"
            className="font-bold text-content hover:underline"
          >
            Messages
          </Link>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close messages"
          className="rounded-full p-1 hover:bg-hover"
        >
          <X className="h-4 w-4 text-content" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {selected ? (
          <MessageThread
            conversationId={selected.id}
            participant={selected.participant}
          />
        ) : (
          <ConversationList
            conversations={conversations ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
            isLoading={isLoading}
            isError={isError}
          />
        )}
      </div>
    </div>
  );
}
