'use client';

import { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { useSession } from 'next-auth/react';
import { ArrowLeft } from 'lucide-react';
import Avatar from '../ui/Avatar';
import LoadCircle from '../ui/LoadCircle';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import TypingIndicator from './TypingIndicator';
import PresenceDot from './PresenceDot';
import { useMessages } from '@/app/hooks/useMessages';
import { useTyping } from '@/app/hooks/useTyping';
import { useSocketContext } from '@/app/utils/SocketProvider';
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
  const { isPeerTyping, notifyTyping, stopTypingNow } =
    useTyping(conversationId);
  const { onlineUsers } = useSocketContext();
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
  const isParticipantOnline = Boolean(
    participant && onlineUsers[participant.id]
  );
  const lastMineId = [...messages]
    .reverse()
    .find((message) => message.sender === currentUserId)?._id;

  const handleSend = (content: string) => {
    stopTypingNow();
    sendMessage(content);
  };

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
        <span className="relative flex-shrink-0">
          <Avatar
            src={participant?.image}
            alt={`${name}'s profile`}
            size="md"
          />
          <PresenceDot online={isParticipantOnline} />
        </span>
        <div className="flex flex-col">
          <span className="font-bold text-content">{name}</span>
          {isParticipantOnline && (
            <span className="text-xs text-muted">Active now</span>
          )}
        </div>
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
                  seenByPeer={
                    message._id === lastMineId &&
                    Boolean(participant) &&
                    message.readBy.includes(participant?.id as string)
                  }
                />
              ))}
            </div>
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="flex-shrink-0">
        {isPeerTyping && <TypingIndicator name={participant?.name} />}
        <MessageComposer onSend={handleSend} onTyping={notifyTyping} />
      </div>
    </div>
  );
}
