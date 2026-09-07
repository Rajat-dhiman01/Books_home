import { cn } from '@/lib/utils'

interface ProgressRingProps {
  /** 0–100. Values outside this range are clamped. */
  percent: number
  size?: number
  strokeWidth?: number
  label: string
  sublabel: string
  className?: string
  ringClassName?: string
}

export function ProgressRing({
  percent,
  size = 96,
  strokeWidth = 8,
  label,
  sublabel,
  className,
  ringClassName = 'text-accent',
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, percent))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn('fill-none transition-[stroke-dashoffset] duration-700 ease-out', ringClassName)}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="font-display text-lg font-medium leading-none text-foreground">{label}</div>
        <div className="mt-1 text-[10px] leading-tight text-muted">{sublabel}</div>
      </div>
    </div>
  )
}