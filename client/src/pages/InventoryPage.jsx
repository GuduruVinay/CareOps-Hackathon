import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, AlertTriangle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, ResponsiveContainer } from 'recharts';
import ThemeToggle from '../components/ThemeToggle';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const WORKSPACE_ID = 1;

  useEffect(() => {
    axios.get(`http://localhost:5000/api/inventory/${WORKSPACE_ID}`)
      .then(res => {
        // Sort alphabetically
        const sortedData = res.data.sort((a, b) => a.item_name.localeCompare(b.item_name));
        setInventory(sortedData);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  if (loading) return <div className="p-8 min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-white">Loading...</div>;

  // Stats
  const totalItems = inventory.length;
  const lowStockCount = inventory.filter(i => i.quantity < i.low_stock_threshold).length;
  const totalStockCount = inventory.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 transition-colors duration-200">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Overview</h1>
          <p className="text-gray-500 dark:text-gray-400">Real-time supply tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            &larr; Dashboard
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
           <p className="text-sm text-gray-500 dark:text-gray-400">Total Products</p>
           <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalItems}</h2>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
           <p className="text-sm text-gray-500 dark:text-gray-400">Total Units</p>
           <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalStockCount}</h2>
        </div>
        <div className={`bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border ${lowStockCount > 0 ? 'border-red-200 dark:border-red-900' : 'border-gray-100 dark:border-gray-700'}`}>
           <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock Alerts</p>
           <h2 className={`text-3xl font-bold mt-2 ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{lowStockCount}</h2>
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inventory.map((item) => {
          const isLow = item.quantity < item.low_stock_threshold;
          const targetCapacity = item.target_capacity || 100;
          const percentage = Math.round((item.quantity / targetCapacity) * 100);
          
          // Colors
          const ringColor = isLow ? '#ef4444' : '#3b82f6'; // Red or Blue
          // We can use CSS variables for dark mode, but for Recharts data 'fill', we usually need hex.
          // A simple workaround for the "Track" color in dark mode is handling it via transparency or a neutral gray.
          const trackColor = isLow ? '#fee2e2' : '#e5e7eb'; 

          // Pie Chart Data with direct 'fill' property (No Cell needed)
          const pieData = [
            { value: item.quantity, fill: ringColor }, 
            { value: targetCapacity - item.quantity, fill: trackColor }, 
          ];

          return (
            <Link key={item.id} to={`/inventory/${item.id}`}>
                <div className={`
                    group relative bg-white dark:bg-gray-800 p-6 rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-1
                    ${isLow ? 'border-red-200 dark:border-red-900/50' : 'border-gray-200 dark:border-gray-700'}
                `}>
                    
                    {/* Top Label (Status) */}
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg ${isLow ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                           <Package size={20} />
                        </div>
                        {isLow && (
                            <span className="bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-1 rounded-full border border-red-200 dark:border-red-800 flex items-center gap-1">
                                <AlertTriangle size={10} /> LOW
                            </span>
                        )}
                    </div>
                
                    <div className="flex items-center gap-4">
                        {/* THE RING (Donut Chart) */}
                        <div className="h-20 w-20 relative shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        innerRadius={28}
                                        outerRadius={36}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={4}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Text in Center */}
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-400 dark:text-gray-500">
                                {percentage}%
                            </div>
                        </div>

                        {/* Text Info */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{item.item_name}</h3>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">units</span>
                            </div>
                            
                            {/* NEW: Threshold + Target displayed side by side */}
                            <div className="flex gap-3 mt-1 text-[10px] text-gray-400 font-medium">
                                <span>Threshold: {item.low_stock_threshold}</span>
                                <span className="text-gray-300 dark:text-gray-600">|</span>
                                <span>Target: {targetCapacity}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700/50 flex justify-between items-center text-xs font-semibold text-gray-400 group-hover:text-blue-500 transition-colors">
                        View Analytics
                        <ChevronRight size={14} />
                    </div>
                </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}