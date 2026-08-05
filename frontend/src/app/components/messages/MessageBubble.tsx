import { relativeTime } from '@/app/utils/relativeTime';
import type { Message } from '@/app/types/Message';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  seenByPeer?: boolean;
}

export default function MessageBubble({
  message,
  isMine,
  seenByPeer,
}: MessageBubbleProps) {
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
          {message.images && message.images.length > 0 && (
            <div
              className={`mt-2 grid gap-1 ${message.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}
            >
              {message.images.map((image) => (
                <img
                  key={image}
                  src={image}
                  loading="lazy"
                  className="max-h-64 w-full rounded-xl object-cover"
                  alt="Message attachment"
                />
              ))}
            </div>
          )}
        </div>
        <span
          className={`mt-1 text-xs text-muted ${isMine ? 'text-right' : 'text-left'}`}
        >
          {message.status === 'sending' && 'Sending...'}
          {message.status === 'failed' && 'Failed to send'}
          {!message.status &&
            (seenByPeer ? 'Read' : relativeTime(message.createdAt))}
        </span>
      </div>
    </div>
  );
}
