import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary-blue' | 'primary-black' | 'secondary-outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  'primary-blue':
    'bg-primary text-white hover:bg-primary-hover active:brightness-95 disabled:bg-primary disabled:opacity-50 disabled:cursor-not-allowed',
  'primary-black':
    'bg-btn text-btn-fg hover:bg-btn-hover disabled:opacity-50 disabled:cursor-not-allowed',
  'secondary-outline':
    'bg-transparent border border-border-strong text-content hover:bg-hover disabled:opacity-50 disabled:cursor-not-allowed',
  ghost: 'bg-transparent text-content hover:bg-hover',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-4 text-[14px]',
  md: 'h-9 px-4 text-[15px]',
  lg: 'h-[52px] px-6 text-[17px]',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export default function Button({
  variant = 'primary-blue',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`rounded-full font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}
