import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, AlertTriangle, ChevronRight, Search, Layers, ArrowLeft, Boxes } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, ResponsiveContainer } from 'recharts';
import ThemeToggle from '../components/ThemeToggle';
import LoadingThrobber from '../components/LoadingThrobber';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const WORKSPACE_ID = 1;

  useEffect(() => {
    axios.get(`http://localhost:5000/api/inventory/${WORKSPACE_ID}`)
      .then(res => {
        const sortedData = res.data.sort((a, b) => a.item_name.localeCompare(b.item_name));
        setInventory(sortedData);
        setFilteredInventory(sortedData);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = inventory.filter(item => 
      item.item_name.toLowerCase().includes(lowerQuery) ||
      item.id.toString().includes(lowerQuery)
    );
    setFilteredInventory(filtered);
  }, [searchQuery, inventory]);

  //if (loading) return <div className="p-8 min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-white">Loading...</div>;
  if (loading) return <LoadingThrobber />;

  const totalItems = inventory.length;
  const lowStockCount = inventory.filter(i => i.quantity < i.low_stock_threshold).length;
  const totalStockCount = inventory.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 transition-colors duration-200">
      
      {/* --- REORDERED HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        
        {/* LEFT GROUP: Navigation + Title */}
        <div className="flex items-center gap-4">
          <Link 
            to="/" 
            className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"
            title="Back to Dashboard"
          >
            <ArrowLeft size={20} />
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none">
              <Boxes size={24} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory <span className="hidden md:inline-block">Overview</span></h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your clinic's supply</p>
             </div>
          </div>
        </div>
        
        {/* RIGHT GROUP: Search + Theme */}
        <div className="flex flex-1 md:flex-none w-full md:w-auto items-center gap-3">
          <div className="relative flex-1 md:w-72 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none dark:text-white transition-all shadow-sm"
            />
          </div>
          <ThemeToggle className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm" />
        </div>

      </div>

      {/* --- RICH SUMMARY CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between relative overflow-hidden group">
           <div className="relative z-10">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Products</p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{totalItems}</h2>
           </div>
           <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
              <Package size={28} />
           </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between relative overflow-hidden group">
           <div className="relative z-10">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Units in Stock</p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{totalStockCount}</h2>
           </div>
           <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
              <Layers size={28} />
           </div>
        </div>

        <div className={`bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border flex items-center justify-between relative overflow-hidden group transition-colors
            ${lowStockCount > 0 ? 'border-red-200 dark:border-red-900' : 'border-gray-100 dark:border-gray-700'}
        `}>
           <div className="relative z-10">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Low Stock Alerts</p>
              <h2 className={`text-3xl font-bold mt-1 ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{lowStockCount}</h2>
           </div>
           <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform ${lowStockCount > 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-600' : 'bg-green-50 dark:bg-green-900/20 text-green-600'}`}>
              <AlertTriangle size={28} />
           </div>
        </div>
      </div>

      {/* --- INVENTORY GRID --- */}
      {filteredInventory.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
            <Package className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No items found</h3>
            <p className="text-gray-500">Try adjusting your search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInventory.map((item) => {
            const isLow = item.quantity < item.low_stock_threshold;
            const derivedTarget = Math.max(item.low_stock_threshold * 3, item.quantity);
            const targetCapacity = item.target_capacity || derivedTarget || 100;
            const percentage = Math.round((item.quantity / targetCapacity) * 100);
            
            const ringColor = isLow ? '#ef4444' : '#3b82f6';
            const trackColor = isLow ? '#fee2e2' : '#e5e7eb';
            
            const pieData = [
                { value: item.quantity, fill: ringColor }, 
                { value: Math.max(0, targetCapacity - item.quantity), fill: trackColor }, 
            ];

            return (
                <Link key={item.id} to={`/inventory/${item.id}`}>
                    <div className={`
                        group relative bg-white dark:bg-gray-800 p-6 rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-1
                        ${isLow ? 'border-red-200 dark:border-red-900/50' : 'border-gray-200 dark:border-gray-700'}
                    `}>
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
                            {/* Ring Chart */}
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
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-400 dark:text-gray-500">
                                    {percentage}%
                                </div>
                            </div>

                            {/* Details */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{item.item_name}</h3>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">units</span>
                                </div>
                                <div className="flex gap-3 mt-1 text-[10px] text-gray-400 font-medium">
                                    <span>Min: {item.low_stock_threshold}</span>
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
      )}
    </div>
  );
}