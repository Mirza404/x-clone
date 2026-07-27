'use client';

import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const XMark = ({ className }: { className?: string }) => (
  <svg
    className={className}
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M13.795 10.533 20.68 2h-3.073l-5.255 6.517L7.69 2H1l7.806 10.91L1.47 22h3.074l5.705-7.07L15.31 22H22l-8.205-11.467Zm-2.38 2.95L9.97 11.464 4.36 3.627h2.31l4.528 6.317 1.443 2.02 6.018 8.409h-2.31l-4.934-6.89Z" />
  </svg>
);

const GoogleMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63H1.29A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.29 5.37l3.98-3.09Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.43-3.43C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.63l3.98 3.09C6.22 6.88 8.87 4.77 12 4.77Z"
    />
  </svg>
);

export default function SignInPage() {
  const router = useRouter();
  const { status } = useSession();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/posts');
    }
  }, [status, router]);

  const handleGoogleSignIn = async () => {
    setPending(true);
    await signIn('google', { callbackUrl: '/posts' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex bg-bg text-content">
      <div className="relative hidden flex-1 items-center justify-center bg-primary lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.12),transparent_55%)]" />
        <XMark className="h-64 w-64 text-white" />
      </div>

      <div className="flex flex-1 flex-col justify-center px-8 py-12 sm:px-16 lg:px-24">
        <div className="mx-auto w-full max-w-[380px]">
          <XMark className="mb-10 h-9 w-9 lg:hidden" />

          <h1 className="text-[32px] font-extrabold leading-tight sm:text-[40px]">
            Happening now
          </h1>
          <p className="mt-8 text-2xl font-bold sm:text-[26px]">Join today.</p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={pending}
              className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-border-strong bg-bg font-bold text-content transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border-strong border-t-content" />
              ) : (
                <>
                  <GoogleMark className="h-5 w-5" />
                  Sign in with Google
                </>
              )}
            </button>
          </div>

          <p className="mt-6 text-[13px] leading-5 text-muted">
            By signing in, you agree to the Terms of Service and Privacy
            Policy, for the purposes of this demo project.
          </p>
        </div>
      </div>
    </div>
  );
}
