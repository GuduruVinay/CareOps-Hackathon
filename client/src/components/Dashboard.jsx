import { useState, useEffect } from 'react';
import axios from 'axios'; // IMPORT AXIOS
import { Link } from 'react-router-dom';
import { CalendarRange, MessageSquare, AlertTriangle, ExternalLink, ArrowRight, User, Activity } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import AIAssistant from '../components/AIAssistant';
import LoadingThrobber from '../components/LoadingThrobber';

export default function Dashboard() {
  const [stats, setStats] = useState({
    bookings: 0,
    unread: 0,
    lowStock: 0
  });
  const [loading, setLoading] = useState(true);
  const WORKSPACE_ID = 1; // Default Workspace

  useEffect(() => {
    const fetchData = async () => {
      try {
        // --- REAL API CALL ---
        const res = await axios.get(`http://localhost:5000/api/dashboard/${WORKSPACE_ID}`);
        
        // Map backend response keys to frontend state
        setStats({
          bookings: res.data.upcoming_bookings,
          unread: res.data.unread_messages,
          lowStock: res.data.low_stock_items
        });
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading dashboard data", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingThrobber />;

  // --- REUSABLE STAT CARD COMPONENT ---
  const StatCard = ({ title, count, icon: Icon, linkTo, colorClass, bgClass, borderColor }) => (
    <Link to={linkTo} className="block group h-full">
      <div className={`relative overflow-hidden rounded-2xl border ${borderColor} bg-white dark:bg-gray-800 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full flex flex-col justify-between`}>
        
        {/* Top Section */}
        <div className="flex justify-between items-start z-10 relative">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
            <h3 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {count}
            </h3>
          </div>
          
          {/* Icon with Zoom Effect */}
          <div className={`p-3 rounded-xl ${bgClass} ${colorClass} transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
            <Icon size={24} />
          </div>
        </div>
        
        {/* Decorative Background Circle */}
        <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${bgClass} opacity-20 group-hover:scale-150 transition-transform duration-500 ease-out`} />
        
        {/* Bottom Link Indicator */}
        <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          <span>View details</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 transition-colors duration-200">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="inline-flex p-3 bg-blue-600 rounded-xl mb-4">
              <Activity className="text-white" size={32} />
            </div>
            <h1 className="mb-4 text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">CareOps Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="p-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                <User size={12} className="text-gray-500 dark:text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back, Admin</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row items-center gap-3 w-full md:w-auto">
           <Link 
             to="/book" 
             target="_blank"
             className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 md:py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 dark:shadow-none whitespace-nowrap"
           >
             Open Booking Page <ExternalLink size={16} />
           </Link>

           <ThemeToggle className="p-3 md:p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm shrink-0" />
        </div>
      </div>

      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        
        <StatCard 
          title="Upcoming Bookings" 
          count={stats.bookings} 
          icon={CalendarRange} 
          linkTo="/bookings"
          borderColor="border-blue-100 dark:border-blue-900/30"
          colorClass="text-blue-600 dark:text-blue-400"
          bgClass="bg-blue-50 dark:bg-blue-900/20"
        />
        
        <StatCard 
          title="Unread Messages" 
          count={stats.unread} 
          icon={MessageSquare} 
          linkTo="/inbox"
          borderColor="border-purple-100 dark:border-purple-900/30"
          colorClass="text-purple-600 dark:text-purple-400"
          bgClass="bg-purple-50 dark:bg-purple-900/20"
        />
        
        <StatCard 
          title="Low Stock Alerts" 
          count={stats.lowStock} 
          icon={AlertTriangle} 
          linkTo="/inventory"
          borderColor="border-red-100 dark:border-red-900/30"
          colorClass="text-red-600 dark:text-red-400"
          bgClass="bg-red-50 dark:bg-red-900/20"
        />

      </div>

      {/* --- QUICK ACTION BANNER --- */}
      <div className="mt-8 bg-linear-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg">
        {/* Background Patterns */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-2">Need a quick report?</h2>
            <p className="text-blue-100 max-w-lg">
              Ask the AI Assistant to "Show me today's bookings" or "Check low stock items" to get an instant summary without navigating.
            </p>
          </div>
          <button 
            className="group px-6 py-3 bg-white text-blue-600 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 shadow-md hover:bg-blue-50 hover:shadow-xl hover:-translate-y-1 hover:scale-105 active:scale-95 active:translate-y-0"
            onClick={() => window.dispatchEvent(new Event('open-ai-chat'))}
          >
            <Activity size={20} className="transition-transform group-hover:rotate-12" /> 
            Try AI Assistant
          </button>
        </div>
      </div>
      
      <AIAssistant context="admin" />
    </div>
  );
}