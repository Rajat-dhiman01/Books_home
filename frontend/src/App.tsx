import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Nav } from '@/components/Nav'
import Dashboard from './pages/Dashboard'
import SeatMap from './pages/SeatMap'

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/seats" element={<SeatMap />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App