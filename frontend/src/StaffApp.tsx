import { Routes, Route } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { MobileTopBar, MobileBottomNav } from '@/components/MobileNav'
import { RequireStaffAuth } from '@/components/RequireStaffAuth'
import Dashboard from './pages/Dashboard'
import SeatMap from './pages/SeatMap'
import Members from './pages/Members'
import Attendance from './pages/Attendance'
import Settings from './pages/Settings'
import StaffAccounts from './pages/StaffAccounts'

// Staff-facing app: sidebar + bottom nav chrome. Wrapped in RequireStaffAuth
// so nothing here renders (and no /api requests fire) until a real staff
// session is confirmed — previously this had no auth check at all.
export default function StaffApp() {
  return (
    <RequireStaffAuth>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar />
          <main className="flex-1 pb-20 lg:pb-0">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/seats" element={<SeatMap />} />
              <Route path="/members" element={<Members />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/staff-accounts" element={<StaffAccounts />} />
            </Routes>
          </main>
          <MobileBottomNav />
        </div>
      </div>
    </RequireStaffAuth>
  )
}