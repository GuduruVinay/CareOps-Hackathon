import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { CalendarRange, MessageSquare, AlertTriangle, ExternalLink, ArrowRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import AIAssistant from './AIAssistant';
import LoadingThrobber from './LoadingThrobber';

export default function Dashboard() {
  const [stats, setStats] = useState({
    bookings: 0,
    unread: 0,
    lowStock: 0
  });
  const [loading, setLoading] = useState(true);
  const WORKSPACE_ID = 1;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Bookings (Count upcoming)
        const bookingsRes = await axios.get(`http://localhost:5000/api/bookings/${WORKSPACE_ID}`);
        const upcomingBookings = bookingsRes.data.filter(b => new Date(b.start_time) > new Date()).length;

        // 2. Fetch Inventory (Count low stock < 10)
        const inventoryRes = await axios.get('http://localhost:5000/api/inventory');
        const lowStockCount = inventoryRes.data.filter(item => item.quantity < 10).length;

        // 3. Get Unread Messages from LocalStorage (Sync with InboxPage)
        const savedChats = JSON.parse(localStorage.getItem('inbox_conversations') || '[]');
        const unreadCount = savedChats.reduce((acc, chat) => acc + (chat.unread || 0), 0);

        setStats({
          bookings: upcomingBookings,
          lowStock: lowStockCount,
          unread: unreadCount
        });
      } catch (error) {
        console.error("Error loading dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- REUSABLE STAT CARD COMPONENT ---
  const StatCard = ({ title, count, icon: Icon, linkTo, colorClass, bgClass }) => (
    <Link to={linkTo} className="block group">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        
        {/* Top Section */}
        <div className="flex justify-between items-start z-10 relative">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
            <h3 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {loading ? '-' : count}
            </h3>
          </div>
          
          {/* Icon with Zoom Effect */}
          <div className={`p-3 rounded-xl ${bgClass} ${colorClass} transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
            <Icon size={24} />
          </div>
        </div>
        
        {/* Decorative Background Circle */}
        <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${bgClass} opacity-10 group-hover:scale-150 transition-transform duration-500 ease-out`} />
        
        {/* Bottom Link Indicator */}
        <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          <span>View details</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 transition-colors duration-200">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">CareOps Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back, Admin</p>
        </div>

        <div className="flex items-center gap-3">
           {/* Standardized Theme Toggle */}
           <ThemeToggle className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm" />
           
           {/* Improved Primary Button */}
           <Link 
             to="/book" 
             className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
           >
             Open Booking Page <ExternalLink size={16} />
           </Link>
        </div>
      </div>

      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <StatCard 
          title="Upcoming Bookings" 
          count={stats.bookings} 
          icon={CalendarRange} 
          linkTo="/bookings"
          colorClass="text-blue-600 dark:text-blue-400"
          bgClass="bg-blue-50 dark:bg-blue-900/20"
        />
        
        <StatCard 
          title="Unread Messages" 
          count={stats.unread} 
          icon={MessageSquare} 
          linkTo="/inbox"
          colorClass="text-purple-600 dark:text-purple-400"
          bgClass="bg-purple-50 dark:bg-purple-900/20"
        />
        
        <StatCard 
          title="Low Stock Alerts" 
          count={stats.lowStock} 
          icon={AlertTriangle} 
          linkTo="/inventory"
          colorClass="text-red-600 dark:text-red-400"
          bgClass="bg-red-50 dark:bg-red-900/20"
        />

      </div>
      <AIAssistant context="admin" />
    </div>
  );
}