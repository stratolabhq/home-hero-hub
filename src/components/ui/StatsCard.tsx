interface StatsCardProps {
  label: string;
  value: string | number;
  /** Icon rendered above the value (emoji or SVG element) */
  icon?: React.ReactNode;
  /** Colour applied to the value text */
  valueColor?: string;
  /** Optional trend indicator */
  trend?: { direction: 'up' | 'down' | 'neutral'; label: string };
  /** Whether this card is in an active/selected state */
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StatsCard({
  label,
  value,
  icon,
  valueColor = '#2e6f40',
  trend,
  active = false,
  onClick,
  className = '',
}: StatsCardProps) {
  const trendColor =
    trend?.direction === 'up'
      ? 'text-[#10b981]'
      : trend?.direction === 'down'
      ? 'text-red-500'
      : 'text-gray-500';

  return (
    <div
      onClick={onClick}
      className={[
        'bg-white rounded-xl shadow-sm border transition-all select-none',
        onClick ? 'cursor-pointer hover:shadow-md' : '',
        active
          ? 'border-[#2e6f40] ring-2 ring-[#2e6f40] ring-offset-1 bg-[#f0f9f2]'
          : 'border-gray-100 hover:border-[#a3d9b0]',
        'p-5 flex flex-col items-center text-center gap-1',
        className,
      ].join(' ')}
    >
      {icon && (
        <div className="mb-1 text-2xl">{icon}</div>
      )}
      <div
        className="text-3xl font-bold leading-none tabular-nums"
        style={{ color: valueColor }}
      >
        {value}
      </div>
      <div className="text-xs font-medium text-gray-500 capitalize mt-1">
        {label}
      </div>
      {trend && (
        <div className={['text-xs mt-0.5', trendColor].join(' ')}>
          {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '–'}{' '}
          {trend.label}
        </div>
      )}
    </div>
  );
}
