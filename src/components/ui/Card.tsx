interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Adds a subtle left border accent in forest green */
  accent?: boolean;
  /** Hover shadow lift effect */
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  children,
  className = '',
  accent = false,
  hoverable = false,
  padding = 'md',
}: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-xl shadow-sm border border-gray-100',
        accent ? 'border-l-4 border-l-[#2e6f40]' : '',
        hoverable ? 'transition-shadow hover:shadow-md cursor-pointer' : '',
        paddingClasses[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={['px-6 py-4 border-b border-gray-100', className].join(' ')}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={['p-6', className].join(' ')}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={['px-6 py-4 border-t border-gray-100 bg-[#f0f9f2] rounded-b-xl', className].join(' ')}>
      {children}
    </div>
  );
}
