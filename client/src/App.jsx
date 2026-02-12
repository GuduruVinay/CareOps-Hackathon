import { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Users, AlertTriangle, MessageSquare } from 'lucide-react';

// Import Pages
import BookingForm from './components/BookingForm';
import BookingsPage from './pages/BookingsPage';
import InboxPage from './pages/InboxPage';
import InventoryPage from './pages/InventoryPage';
import InventoryDetailPage from './pages/InventoryDetailPage';
import ThemeToggle from './components/ThemeToggle';

// --- DASHBOARD COMPONENT ---
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`http://localhost:5000/api/dashboard/1`)
      .then(res => { setStats(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  if (loading) return <div className="p-8 dark:bg-gray-900 dark:text-white min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CareOps Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Welcome back, Admin</p>
        </div>
        
        <div className="flex gap-4 items-center">
            <ThemeToggle />
            <Link to="/book" target="_blank" className="px-4 py-2 bg-gray-900 dark:bg-blue-600 text-white rounded-lg text-sm hover:bg-gray-800 dark:hover:bg-blue-700 transition-colors">
            Open Booking Page ↗
            </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/bookings">
            <StatCard title="Upcoming Bookings" value={stats?.upcoming_bookings || 0} icon={Users} />
        </Link>
        
        <Link to="/inbox">
            <StatCard title="Unread Messages" value={stats?.unread_messages || 0} icon={MessageSquare} />
        </Link>
        
        <Link to="/inventory">
            <StatCard title="Low Stock Alerts" value={stats?.low_stock_items || 0} icon={AlertTriangle} alert={(stats?.low_stock_items || 0) > 0} />
        </Link>
      </div>
    </div>
  );
};

// Reusable Stat Card with Dark Mode
const StatCard = ({ title, value, icon: Icon, alert }) => (
  <div className={`p-6 rounded-xl shadow-sm border transition-colors duration-200 cursor-pointer hover:shadow-md
    ${alert ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700'}`}>
    
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className={`text-3xl font-bold mt-2 ${alert ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{value}</p>
      </div>
      
      <div className={`p-3 rounded-full ${alert ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200' : 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400'}`}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

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