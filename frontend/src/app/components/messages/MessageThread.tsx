'use client';

import { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { useSession } from 'next-auth/react';
import { ArrowLeft } from 'lucide-react';
import Avatar from '../ui/Avatar';
import LoadCircle from '../ui/LoadCircle';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import { useMessages } from '@/app/hooks/useMessages';
import type { ConversationParticipant } from '@/app/types/Conversation';

interface MessageThreadProps {
  conversationId: string;
  participant: ConversationParticipant | null;
  onBack?: () => void;
}

export default function MessageThread({
  conversationId,
  participant,
  onBack,
}: MessageThreadProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const {
    messages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    sendMessage,
  } = useMessages(conversationId);
  const { ref: topSentinelRef, inView: topInView } = useInView();
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousMessageCount = useRef(0);

  useEffect(() => {
    if (topInView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [topInView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (messages.length > previousMessageCount.current) {
      bottomRef.current?.scrollIntoView({
        behavior: previousMessageCount.current === 0 ? 'auto' : 'smooth',
      });
    }
    previousMessageCount.current = messages.length;
  }, [messages.length]);

  const name = participant?.name ?? 'Unknown user';

  return (
    <div className="flex h-[75vh] min-h-[400px] flex-col">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-border p-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="rounded-full p-1.5 hover:bg-hover md:hidden"
          >
            <ArrowLeft className="h-5 w-5 text-content" />
          </button>
        )}
        <Avatar src={participant?.image} alt={`${name}'s profile`} size="md" />
        <span className="font-bold text-content">{name}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <LoadCircle />
        ) : (
          <>
            <div ref={topSentinelRef}>
              {isFetchingNextPage && <LoadCircle />}
            </div>
            <div className="py-2">
              {messages.map((message) => (
                <MessageBubble
                  key={message._id}
                  message={message}
                  isMine={message.sender === currentUserId}
                />
              ))}
            </div>
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="flex-shrink-0">
        <MessageComposer onSend={sendMessage} />
      </div>
    </div>
  );
}
