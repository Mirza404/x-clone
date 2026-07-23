'use client';

import { useRef, useState } from 'react';
import { useEnterSubmit } from '@/app/utils/formSubmit';

const MAX_LENGTH = 2000;

interface MessageComposerProps {
  onSend: (content: string) => void;
  onTyping?: () => void;
}

export default function MessageComposer({
  onSend,
  onTyping,
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
    }
  };

  const handleSubmit = () => {
    if (content.trim() === '') return;
    onSend(content);
    setContent('');
    resetTextareaHeight();
  };

  return (
    <form
      className="flex items-end gap-2 border-t border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <textarea
        ref={textareaRef}
        className="h-6 max-h-[150px] flex-1 resize-none overflow-hidden bg-input rounded-2xl px-4 py-1.5 text-[15px] text-content placeholder-muted focus:outline-none"
        placeholder="Start a new message"
        maxLength={MAX_LENGTH}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          onTyping?.();
        }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = '24px';
          target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
        }}
        onKeyDown={useEnterSubmit({
          loading: false,
          content,
          onSubmit: handleSubmit,
        })}
      />
      <button
        type="submit"
        disabled={content.trim() === ''}
        className="flex h-9 items-center justify-center rounded-full bg-btn px-4 text-[15px] font-bold text-btn-fg transition-colors hover:bg-btn-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
