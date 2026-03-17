import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-[#2e6f40] text-white hover:bg-[#3d8b54] active:bg-[#1f4d2b] focus:ring-[#2e6f40] shadow-sm',
  secondary:
    'bg-[#f0f9f2] text-[#1f4d2b] border border-[#a3d9b0] hover:bg-[#d1ecd7] hover:border-[#6fbf7d] focus:ring-[#2e6f40]',
  ghost:
    'text-[#2e6f40] hover:bg-[#f0f9f2] active:bg-[#d1ecd7] focus:ring-[#2e6f40]',
  danger:
    'bg-[#ef4444] text-white hover:bg-[#dc2626] active:bg-[#b91c1c] focus:ring-[#ef4444] shadow-sm',
  outline:
    'border border-[#2e6f40] text-[#2e6f40] hover:bg-[#f0f9f2] focus:ring-[#2e6f40]',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center gap-2 font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...props}
      >
        {loading && (
          <svg
            className="w-4 h-4 animate-spin text-current"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
