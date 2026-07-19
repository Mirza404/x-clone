export default function PostSkeleton() {
  return (
    <div
      data-testid="post-skeleton"
      className="flex w-full animate-pulse flex-row gap-3 border-b border-border p-4"
    >
      <div className="h-12 w-12 flex-shrink-0 rounded-full bg-input" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="h-3 w-40 rounded bg-input" />
        <div className="h-3 w-full rounded bg-input" />
        <div className="h-3 w-3/4 rounded bg-input" />
      </div>
    </div>
  );
}
