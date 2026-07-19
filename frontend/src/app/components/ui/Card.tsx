import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Card({
  title,
  trailing,
  children,
  className = '',
}: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-bg p-4 text-content ${className}`}
    >
      {(title || trailing) && (
        <div className="mb-2 flex items-center justify-between">
          {title && <h2 className="text-xl font-extrabold">{title}</h2>}
          {trailing}
        </div>
      )}
      {children}
    </div>
  );
}
