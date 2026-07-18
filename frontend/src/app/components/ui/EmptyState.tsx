import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="px-8 py-16 text-center">
      <h2 className="text-2xl font-extrabold text-content">{title}</h2>
      {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
