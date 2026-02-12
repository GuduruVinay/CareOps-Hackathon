import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, AlertTriangle, ChevronRight, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import ThemeToggle from '../components/ThemeToggle';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const WORKSPACE_ID = 1;

  useEffect(() => {
    axios.get(`http://localhost:5000/api/inventory/${WORKSPACE_ID}`)
      .then(res => {
        setInventory(res.data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  if (loading) return <div className="p-8 min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-white">Loading...</div>;

  // Calculate Summary Stats
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
          <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">
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
           <p className="text-sm text-gray-500 dark:text-gray-400">Total Units in Stock</p>
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
          // Calculate percentage (assuming 100 is max for viz purposes)
          const percentage = Math.min((item.quantity / 100) * 100, 100);
          
          const pieData = [
            { name: 'Stock', value: item.quantity },
            { name: 'Empty', value: 100 - Math.min(item.quantity, 100) },
          ];

          return (
            <Link key={item.id} to={`/inventory/${item.id}`}>
                <div className={`group bg-white dark:bg-gray-800 p-6 rounded-2xl border transition-all hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500
                    ${isLow ? 'border-red-200 dark:border-red-900' : 'border-gray-200 dark:border-gray-700'}
                `}>
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${isLow ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                    <Package size={24} />
                    </div>
                    {isLow && (
                    <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <AlertTriangle size={12} /> LOW
                    </span>
                    )}
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{item.item_name}</h3>
                <p className="text-xs text-gray-400 mt-1">ID: #{item.id}</p>

                <div className="mt-6 flex items-center gap-6">
                    {/* Tiny Pie Chart for Visual Flair */}
                    <div className="h-16 w-16 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={20}
                                    outerRadius={30}
                                    paddingAngle={5}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    <Cell fill={isLow ? '#ef4444' : '#3b82f6'} />
                                    <Cell fill="#e5e7eb" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-400">
                            {Math.round(percentage)}%
                        </div>
                    </div>

                    <div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{item.quantity} <span className="text-sm font-normal text-gray-500">units</span></div>
                        <div className="text-xs text-gray-400">Threshold: {item.low_stock_threshold}</div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-sm font-medium text-blue-600 dark:text-blue-400">
                    View Analytics
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                </div>
                </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}