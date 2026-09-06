import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  icon?: ReactNode
  dotClassName?: string
  ringClassName?: string
  label: string
  value: number
  sub: string
  delay?: number
}

export function StatCard({ icon, dotClassName, ringClassName, label, value, sub, delay = 0 }: StatCardProps) {
  return (
    <Card className="animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {icon}
          {dotClassName && <span className={`h-2.5 w-2.5 rounded-full ${dotClassName}`} />}
          {ringClassName && <span className={`h-2.5 w-2.5 rounded-full ${ringClassName}`} />}
          {label}
        </div>
        <div className="mt-2 font-display text-2xl font-medium text-foreground">{value}</div>
        <div className="mt-0.5 text-xs text-muted">{sub}</div>
      </CardContent>
    </Card>
  )
}