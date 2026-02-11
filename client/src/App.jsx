import { useState, useEffect } from 'react';
import axios from 'axios';
import { LayoutDashboard, Users, AlertTriangle, MessageSquare } from 'lucide-react';

// Simple "Card" component for the stats
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

function App() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hardcoded Workspace ID for the prototype (The one we created in SQL)
  const WORKSPACE_ID = 1; 

  useEffect(() => {
    // Fetch data from YOUR backend
    axios.get(`http://localhost:3000/api/dashboard/${WORKSPACE_ID}`)
      .then(response => {
        setStats(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching data:", err);
        setError("Could not connect to server. Is it running?");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading Dashboard...</div>;
  if (error) return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>;

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">CareOps Dashboard</h1>
        <p className="text-gray-500">Welcome back, Admin</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Upcoming Bookings" 
          value={stats.upcoming_bookings} 
          icon={Users} 
        />
        <StatCard 
          title="Unread Messages" 
          value={stats.unread_messages} 
          icon={MessageSquare} 
        />
        <StatCard 
          title="Low Stock Alerts" 
          value={stats.low_stock_items} 
          icon={AlertTriangle} 
          alert={stats.low_stock_items > 0} 
        />
      </div>

      {/* Quick Actions Placeholder */}
      <div className="bg-white p-6 rounded-xl border border-gray-100">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + New Booking
          </button>
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            View Inbox
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;