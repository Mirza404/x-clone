import Link from 'next/link';
import Button from './Button';

export default function AuthWall() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-24 bg-gradient-to-t from-bg to-transparent" />
      <div className="flex flex-col items-center gap-4 border-t border-border bg-bg px-8 py-10 text-center">
        <h2 className="text-2xl font-extrabold text-content">
          Don&apos;t miss what&apos;s happening
        </h2>
        <p className="max-w-xs text-[15px] text-muted">
          People on X are the first to know. Sign in to keep reading.
        </p>
        <div className="flex w-full max-w-[280px] flex-col gap-3">
          <Link href="/api/auth/signin" className="w-full">
            <Button variant="primary-black" size="lg" className="w-full">
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
