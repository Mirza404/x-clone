'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import AuthWall from '../../components/ui/AuthWall';
import EmptyState from '../../components/ui/EmptyState';
import ConversationList from '../../components/messages/ConversationList';
import MessageThread from '../../components/messages/MessageThread';
import { useConversations } from '@/app/hooks/useConversations';

export default function MessagesPage() {
  const { status } = useSession();
  const { data: conversations, isLoading, isError } = useConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (status === 'loading') {
    return <div className="animate-pulse p-4 text-muted">Loading…</div>;
  }

  if (status === 'unauthenticated') {
    return <AuthWall />;
  }

  const selected = conversations?.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="sticky top-0 flex h-screen">
      <div
        className={`flex w-full flex-col border-r border-border md:flex md:w-[320px] md:flex-shrink-0 ${
          selectedId ? 'hidden' : 'flex'
        }`}
      >
        <h1 className="z-10 hidden flex-shrink-0 border-b border-border bg-bg/85 p-4 text-xl font-bold text-content backdrop-blur-sm md:block">
          Messages
        </h1>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
            isLoading={isLoading}
            isError={isError}
          />
        </div>
      </div>

      <div
        className={`flex-1 md:block ${selectedId ? 'block' : 'hidden'}`}
      >
        {selected ? (
          <MessageThread
            conversationId={selected.id}
            participant={selected.participant}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <EmptyState
            title="Select a message"
            subtitle="Choose an existing conversation to start chatting."
          />
        )}
      </div>
    </div>
  );
}
