import { Routes, Route } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { MobileTopBar, MobileBottomNav } from '@/components/MobileNav'
import Dashboard from './pages/Dashboard'
import SeatMap from './pages/SeatMap'
import Members from './pages/Members'
import Attendance from './pages/Attendance'
import Settings from './pages/Settings'

// Staff-facing app: sidebar + bottom nav chrome, exactly as before —
// only difference from the previous App.tsx is that this is now its own
// module, lazy-loaded from App.tsx so member-portal visitors never pull
// this bundle in.
export default function StaffApp() {
  return (
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
          </Routes>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  )
}