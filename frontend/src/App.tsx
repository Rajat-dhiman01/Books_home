import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Route-level code-splitting: staff pages and the member portal are
// separate audiences that never need each other's code (member devices in
// particular shouldn't have to download the Sidebar/SeatMap/Settings
// bundle just to check in). Each group loads independently, on demand.
const StaffApp = lazy(() => import('./StaffApp'))
const MemberLogin = lazy(() => import('./pages/member/MemberLogin'))
const MemberCallback = lazy(() => import('./pages/member/MemberCallback'))
const MemberLayout = lazy(() => import('./pages/member/MemberLayout'))
const MemberHome = lazy(() => import('./pages/member/Home'))
const MemberAttendance = lazy(() => import('./pages/member/Attendance'))
const MemberMembership = lazy(() => import('./pages/member/Membership'))
const MemberSeat = lazy(() => import('./pages/member/Seat'))
const MemberProfile = lazy(() => import('./pages/member/Profile'))

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Member portal: standalone pages, no staff sidebar/nav. Login and
              the OAuth callback are unauthenticated, so they sit outside the
              shell; everything else shares MemberLayout's bottom tab nav and
              single /member/me fetch. */}
          <Route path="/member/login" element={<MemberLogin />} />
          <Route path="/member/callback" element={<MemberCallback />} />
          <Route element={<MemberLayout />}>
            <Route path="/member/dashboard" element={<MemberHome />} />
            <Route path="/member/attendance" element={<MemberAttendance />} />
            <Route path="/member/membership" element={<MemberMembership />} />
            <Route path="/member/seat" element={<MemberSeat />} />
            <Route path="/member/profile" element={<MemberProfile />} />
          </Route>

          {/* Everything else is the staff app, with its own nested routing. */}
          <Route path="/*" element={<StaffApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
export default App