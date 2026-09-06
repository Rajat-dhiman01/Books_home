import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Route-level code-splitting: staff pages and the member portal are
// separate audiences that never need each other's code (member devices in
// particular shouldn't have to download the Sidebar/SeatMap/Settings
// bundle just to check in). Each group loads independently, on demand.
const StaffApp = lazy(() => import('./StaffApp'))
const MemberLogin = lazy(() => import('./pages/member/MemberLogin'))
const MemberCallback = lazy(() => import('./pages/member/MemberCallback'))
const MemberDashboard = lazy(() => import('./pages/member/MemberDashboard'))

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
          {/* Member portal: standalone pages, no staff sidebar/nav. */}
          <Route path="/member/login" element={<MemberLogin />} />
          <Route path="/member/callback" element={<MemberCallback />} />
          <Route path="/member/dashboard" element={<MemberDashboard />} />

          {/* Everything else is the staff app, with its own nested routing. */}
          <Route path="/*" element={<StaffApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
export default App