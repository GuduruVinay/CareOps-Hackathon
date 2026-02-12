import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Package, TrendingDown, TrendingUp, AlertTriangle, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import ThemeToggle from '../components/ThemeToggle';

// Mock Data Generator for "History" Graph
const generateMockHistory = (currentQty) => {
  const data = [];
  let qty = currentQty + 50; // Start higher in the past
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    // Simulate usage
    qty = Math.max(0, qty - Math.floor(Math.random() * 15)); 
    // Random restock event
    if (Math.random() > 0.8) qty += 20; 
    
    data.push({
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      stock: qty
    });
  }
  // Ensure last point matches actual current stock
  data[data.length - 1].stock = currentQty;
  return data;
};

export default function InventoryDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch Item Data
  const fetchItem = () => {
    // In a real app, we'd have a specific GET /api/inventory/:id endpoint
    // For this prototype, we'll fetch all and find the one we need
    axios.get(`http://localhost:5000/api/inventory/1`)
      .then(res => {
        const found = res.data.find(i => i.id === parseInt(id));
        setItem(found);
        setHistoryData(generateMockHistory(found.quantity));
        setLoading(false);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchItem();
  }, [id]);

  const handleRestock = () => {
    axios.post(`http://localhost:5000/api/inventory/${id}/restock`, { amount: 10 })
      .then(() => fetchItem())
      .catch(err => alert("Error"));
  };

  if (loading) return <div className="p-8 min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">Loading...</div>;
  if (!item) return <div className="p-8 text-red-500">Item not found</div>;

  const isLow = item.quantity < item.low_stock_threshold;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 transition-colors duration-200">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link to="/inventory" className="p-2 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {item.item_name}
              {isLow && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full border border-red-200">Low Stock</span>}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">SKU: INV-{item.id.toString().padStart(4, '0')}</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Stats & Action */}
        <div className="space-y-6">
          {/* Main Stock Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium mb-1">Current Stock</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-bold text-gray-900 dark:text-white">{item.quantity}</span>
              <span className="text-sm text-gray-400">units</span>
            </div>
            
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full ${isLow ? 'bg-red-500' : 'bg-blue-500'}`} 
                style={{ width: `${Math.min((item.quantity / 100) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 text-right">Target Capacity: 100 units</p>

            <button 
              onClick={handleRestock}
              className="mt-6 w-full py-3 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Restock Item (+10)
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                   <TrendingUp size={16} /> <span className="text-xs font-bold">+12%</span>
                </div>
                <p className="text-xs text-gray-400">Monthly Usage</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">420</p>
             </div>
             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-orange-500 mb-2">
                   <AlertTriangle size={16} /> <span className="text-xs font-bold">{item.low_stock_threshold}</span>
                </div>
                <p className="text-xs text-gray-400">Alert Threshold</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">Fixed</p>
             </div>
          </div>
        </div>

        {/* Right Col: Charts */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Stock History Chart */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 h-80">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Stock Level History (7 Days)</h3>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="stock" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorStock)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Activity Table (Mock) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
             <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
             <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700">
                   <div className="flex items-center gap-3">
                      <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg text-red-600"><TrendingDown size={16}/></div>
                      <div>
                         <p className="text-sm font-medium text-gray-900 dark:text-white">Usage: Patient #102</p>
                         <p className="text-xs text-gray-500">Today, 10:23 AM</p>
                      </div>
                   </div>
                   <span className="font-bold text-gray-900 dark:text-white">-2 units</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700">
                   <div className="flex items-center gap-3">
                      <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg text-green-600"><Plus size={16}/></div>
                      <div>
                         <p className="text-sm font-medium text-gray-900 dark:text-white">Restocked by Admin</p>
                         <p className="text-xs text-gray-500">Yesterday, 4:00 PM</p>
                      </div>
                   </div>
                   <span className="font-bold text-gray-900 dark:text-white">+50 units</span>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}