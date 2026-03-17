interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'emerald' | 'amber' | 'red' | 'gray' | 'blue' | 'purple' | 'cyan';
  size?: 'sm' | 'md';
  className?: string;
}

const variantClasses: Record<string, string> = {
  green:   'bg-[#d1ecd7] text-[#1f4d2b] border border-[#6fbf7d]',
  emerald: 'bg-[#d1fae5] text-[#065f46] border border-[#6ee7b7]',
  amber:   'bg-amber-100 text-amber-800 border border-amber-300',
  red:     'bg-red-100 text-red-800 border border-red-300',
  gray:    'bg-gray-100 text-gray-700 border border-gray-300',
  blue:    'bg-blue-100 text-blue-800 border border-blue-300',
  purple:  'bg-purple-100 text-purple-800 border border-purple-300',
  cyan:    'bg-cyan-100 text-cyan-800 border border-cyan-300',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs rounded',
  md: 'px-2.5 py-1 text-xs rounded-md',
};

export function Badge({
  children,
  variant = 'green',
  size = 'sm',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center font-medium whitespace-nowrap',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
