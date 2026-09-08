import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Phone, Mail, IdCard, LogOut } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { signOutMember } from '@/lib/memberApi'
import { useMemberInfo } from './MemberLayout'

function parseDateOnly(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDate(dateStr: string) {
  return parseDateOnly(dateStr).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

interface FieldRowProps {
  icon: typeof User
  label: string
  value: string | null
}

function FieldRow({ icon: Icon, label, value }: FieldRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="flex items-center gap-2 text-sm text-muted">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="text-sm text-foreground">{value ?? 'Not on file'}</span>
    </div>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const { info } = useMemberInfo()
  const { member } = info
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOutMember()
      navigate('/member/login', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="font-display text-2xl font-medium text-foreground">Profile</div>
          <Badge variant={member.status === 'ACTIVE' ? 'accent' : 'default'}>{member.status}</Badge>
        </div>

        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <User className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>{member.fullName}</CardTitle>
              <div className="text-sm text-muted">{`Member since ${formatDate(member.createdAt.slice(0, 10))}`}</div>
            </div>
          </CardHeader>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '60ms' }}>
          <CardContent className="divide-y divide-border pt-5">
            <FieldRow icon={IdCard} label="Member code" value={member.memberCode} />
            <FieldRow icon={Phone} label="Phone" value={member.phone} />
            <FieldRow icon={Mail} label="Email" value={member.email} />
          </CardContent>
        </Card>

        <p className="text-xs text-muted">
          These details are managed by library staff. Contact them if anything here needs to be corrected.
        </p>

        <Button type="button" variant="outline" disabled={signingOut} onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          {signingOut ? 'Signing out\u2026' : 'Sign out'}
        </Button>
      </div>
    </div>
  )
}