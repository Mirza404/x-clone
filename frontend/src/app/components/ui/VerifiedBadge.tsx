import { BadgeCheck } from 'lucide-react';

export default function VerifiedBadge() {
  return (
    <BadgeCheck
      className="h-[18px] w-[18px] flex-shrink-0 text-primary"
      aria-label="Verified account"
    />
  );
}
