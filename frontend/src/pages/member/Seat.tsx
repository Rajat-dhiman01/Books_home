import { Armchair, ShieldCheck, Shuffle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useMemberInfo } from './MemberLayout'

export default function Seat() {
  const { info } = useMemberInfo()
  const { seat, membership } = info

  if (!membership) {
    return (
      <div className="px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <div className="font-display text-2xl font-medium text-foreground">Seat</div>
          <Card className="mt-4 animate-fade-in">
            <CardContent className="py-8 text-center">
              <CardTitle className="text-base">No active membership</CardTitle>
              <CardDescription className="mt-1">
                You don't have a membership active today. Please contact library staff.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const isReserved = seat?.assignmentType === 'RESERVED'

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="font-display text-2xl font-medium text-foreground">Seat</div>

        {!seat && (
          <Card className="animate-fade-in">
            <CardContent className="py-8 text-center">
              <CardTitle className="text-base">No seat assigned</CardTitle>
              <CardDescription className="mt-1">
                Your plan doesn't include a fixed seat, or one hasn't been assigned yet. Ask library staff if you'd
                like a preferred seat.
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {seat && (
          <>
            <Card className="animate-fade-in">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Armchair className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>{`Seat ${seat.seatNumber}`}</CardTitle>
                      <CardDescription>{isReserved ? 'Reserved for you' : 'Your preferred seat'}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={isReserved ? 'accent' : 'default'}>{seat.assignmentType}</Badge>
                </div>
              </CardHeader>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '60ms' }}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-muted">
                    {isReserved ? <ShieldCheck className="h-4 w-4" /> : <Shuffle className="h-4 w-4" />}
                  </div>
                  <div>
                    <CardTitle className="text-base">{isReserved ? 'What "Reserved" means' : 'What "Preferred" means'}</CardTitle>
                    <CardDescription className="mt-1.5 leading-relaxed">
                      {isReserved
                        ? "This seat is yours for the full length of your membership, whether you check in or not. No one else can be assigned to it during that period."
                        : "This is your preferred seat when it's available. If you're marked absent, library staff may offer it to another member for that day, but it stays your first choice whenever you're present."}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}