import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Nav } from '@/components/Nav'
import Dashboard from './pages/Dashboard'
import SeatMap from './pages/SeatMap'
import Members from './pages/members'
import Attendance from './pages/Attendance'
import Settings from './pages/Settings'
function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/seats" element={<SeatMap />} />
        <Route path="/members" element={<Members />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}
export default App