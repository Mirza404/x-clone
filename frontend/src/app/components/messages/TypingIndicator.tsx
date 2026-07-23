interface TypingIndicatorProps {
  name?: string | null;
}

export default function TypingIndicator({ name }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-1 text-[13px] text-muted">
      <span>{name ? `${name} is typing` : 'Typing'}</span>
      <span className="flex items-end gap-0.5 pb-0.5">
        <span className="h-1 w-1 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-muted" />
      </span>
    </div>
  );
}
