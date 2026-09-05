import { useMemo } from 'react'

interface MeteorsProps {
  count?: number
}

export function Meteors({ count = 20 }: MeteorsProps) {
  const meteors = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        top: Math.random() * 20,
        left: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 4 + Math.random() * 4,
      })),
    [count],
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {meteors.map((m) => (
        <span
          key={m.id}
          className="animate-meteor absolute h-0.5 w-0.5 rounded-full bg-foreground shadow-[0_0_0_1px_#ffffff10]"
          style={{
            top: `${m.top}%`,
            left: `${m.left}%`,
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.duration}s`,
          }}
        >
          <span className="absolute top-1/2 -z-10 h-px w-24 -translate-y-1/2 bg-gradient-to-r from-foreground to-transparent" />
        </span>
      ))}
    </div>
  )
}