import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

// Import Components
import Dashboard from './components/Dashboard';
import BookingForm from './components/BookingForm';
// Import Pages
import BookingsPage from './pages/BookingsPage';
import InboxPage from './pages/InboxPage';
import InventoryPage from './pages/InventoryPage';
import InventoryDetailPage from './pages/InventoryDetailPage';

// --- MAIN APP COMPONENT ---
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/book" element={<BookingForm />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/:id" element={<InventoryDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}