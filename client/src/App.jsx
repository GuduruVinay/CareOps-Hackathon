import { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, Users, AlertTriangle, MessageSquare } from 'lucide-react';
import BookingForm from './components/BookingForm'; // Import the new component

// --- DASHBOARD COMPONENT ---
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`http://localhost:3000/api/dashboard/1`)
      .then(res => { setStats(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CareOps Dashboard</h1>
          <p className="text-gray-500">Welcome back, Admin</p>
        </div>
        <Link to="/book" target="_blank" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">
          Open Booking Page ↗
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Upcoming Bookings" value={stats?.upcoming_bookings || 0} icon={Users} />
        <StatCard title="Unread Messages" value={stats?.unread_messages || 0} icon={MessageSquare} />
        <StatCard title="Low Stock Alerts" value={stats?.low_stock_items || 0} icon={AlertTriangle} alert={(stats?.low_stock_items || 0) > 0} />
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, alert }) => (
  <div className={`p-6 rounded-xl shadow-sm border ${alert ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={`text-3xl font-bold mt-2 ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
      </div>
      <div className={`p-3 rounded-full ${alert ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
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
      </Routes>
    </BrowserRouter>
  );
}