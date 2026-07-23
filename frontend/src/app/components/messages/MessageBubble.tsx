import { relativeTime } from '@/app/utils/relativeTime';
import type { Message } from '@/app/types/Message';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
}

export default function MessageBubble({ message, isMine }: MessageBubbleProps) {
  return (
    <div
      className={`flex w-full px-4 py-1 ${isMine ? 'justify-end' : 'justify-start'}`}
    >
      <div className="flex max-w-[75%] flex-col">
        <div
          className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-[15px] ${
            isMine ? 'bg-primary text-white' : 'bg-surface text-content'
          } ${message.status === 'failed' ? 'opacity-60' : ''}`}
        >
          {message.content}
        </div>
        <span
          className={`mt-1 text-xs text-muted ${isMine ? 'text-right' : 'text-left'}`}
        >
          {message.status === 'sending' && 'Sending…'}
          {message.status === 'failed' && 'Failed to send'}
          {!message.status && relativeTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}
