import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, TrendingDown, TrendingUp, AlertTriangle, Plus, Minus, Settings, Target } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'; 
import ThemeToggle from '../components/ThemeToggle';

// --- MOCK DATA GENERATORS ---
const generateHistoryData = (currentQty, range) => {
  const data = [];
  let points = 7;
  let labelFormat = 'weekday'; 
  
  if (range === '1M') { points = 30; labelFormat = 'day'; }
  if (range === '6M') { points = 6; labelFormat = 'month'; }
  if (range === '1Y') { points = 12; labelFormat = 'month'; }

  let qty = currentQty + (points * 5); 

  for (let i = points - 1; i >= 0; i--) {
    const date = new Date();
    
    if (labelFormat === 'month') {
        date.setMonth(date.getMonth() - i);
    } else {
        date.setDate(date.getDate() - i);
    }

    qty = Math.max(0, qty - Math.floor(Math.random() * (range === '1Y' ? 50 : 15))); 
    if (Math.random() > 0.7) qty += (range === '1Y' ? 200 : 20); 

    let label = '';
    if (labelFormat === 'weekday') label = date.toLocaleDateString('en-US', { weekday: 'short' });
    if (labelFormat === 'day') label = date.getDate();
    if (labelFormat === 'month') label = date.toLocaleDateString('en-US', { month: 'short' });

    data.push({
      label: label,
      stock: qty
    });
  }
  data[data.length - 1].stock = currentQty;
  return data;
};

// Simple mock data for sparkline
const sparklineData = [
  { val: 40 }, { val: 30 }, { val: 45 }, { val: 50 }, { val: 35 }, { val: 55 }, { val: 40 }, { val: 60 }
];

export default function InventoryDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  // States
  const [restockAmount, setRestockAmount] = useState(10); 
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [newThreshold, setNewThreshold] = useState(0);
  const [newTarget, setNewTarget] = useState(100); 
  const [timeRange, setTimeRange] = useState('7D'); 
  
  const [activities, setActivities] = useState([
    { id: 1, type: 'USAGE', desc: 'Usage: Patient #102', time: 'Today, 10:23 AM', change: -2 },
    { id: 2, type: 'RESTOCK', desc: 'Restocked by Admin', time: 'Yesterday, 4:00 PM', change: 50 }
  ]);

  const fetchItem = () => {
    axios.get(`http://localhost:5000/api/inventory/1`) 
      .then(res => {
        const found = res.data.find(i => i.id === parseInt(id));
        if (found) {
            setItem(found);
            setNewThreshold(found.low_stock_threshold);
            setNewTarget(found.target_capacity || 100); 
            setHistoryData(generateHistoryData(found.quantity, '7D'));
        }
        setLoading(false);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchItem();
  }, [id]);

  useEffect(() => {
    if (item) {
        setHistoryData(generateHistoryData(item.quantity, timeRange));
    }
  }, [timeRange, item]);

  const handleRestock = () => {
    if (restockAmount <= 0) return;
    axios.post(`http://localhost:5000/api/inventory/${id}/restock`, { amount: parseInt(restockAmount) })
      .then(() => {
        setItem(prev => ({ ...prev, quantity: prev.quantity + parseInt(restockAmount) }));
        const newActivity = {
            id: Date.now(),
            type: 'RESTOCK',
            desc: 'Manual Restock',
            time: 'Just now',
            change: parseInt(restockAmount)
        };
        setActivities([newActivity, ...activities]); 
      })
      .catch(err => alert("Error restocking"));
  };

  const handleUpdateSettings = () => {
    axios.put(`http://localhost:5000/api/inventory/${id}`, { 
        low_stock_threshold: parseInt(newThreshold),
        target_capacity: parseInt(newTarget)
    })
      .then(() => {
        setIsEditingSettings(false);
        setItem(prev => ({ 
            ...prev, 
            low_stock_threshold: parseInt(newThreshold),
            target_capacity: parseInt(newTarget)
        }));
      })
      .catch(err => alert("Error updating settings"));
  };

  const incrementRestock = () => setRestockAmount(prev => parseInt(prev) + 1);
  const decrementRestock = () => setRestockAmount(prev => Math.max(1, parseInt(prev) - 1));

  if (loading) return <div className="p-8 min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">Loading...</div>;
  if (!item) return <div className="p-8 text-red-500">Item not found</div>;

  const isLow = item.quantity < item.low_stock_threshold;
  
  const fillPercentage = Math.min((item.quantity / (item.target_capacity || 100)) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 transition-colors duration-200">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          {/* UPDATED BACK BUTTON STYLE */}
          <Link to="/inventory" className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {item.item_name}
              {isLow && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full border border-red-200">Low Stock</span>}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">SKU: INV-{item.id.toString().padStart(4, '0')}</p>
          </div>
        </div>
        
        {/* UPDATED THEME TOGGLE STYLE */}
        <ThemeToggle className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium mb-1">Current Stock</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-bold text-gray-900 dark:text-white">{item.quantity}</span>
              <span className="text-sm text-gray-400">units</span>
            </div>
            
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full ${isLow ? 'bg-red-500' : 'bg-blue-500'}`} 
                style={{ width: `${fillPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 text-right">Target Capacity: {item.target_capacity || 100} units</p>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Quick Restock</label>
                <div className="flex gap-3">
                    <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 overflow-hidden">
                        <button onClick={decrementRestock} className="p-3 px-4 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <Minus size={16} />
                        </button>
                        <input 
                            type="number" 
                            value={restockAmount}
                            onChange={(e) => setRestockAmount(e.target.value)}
                            className="w-14 bg-transparent text-gray-900 dark:text-white font-bold text-center outline-none border-none p-0"
                        />
                        <button onClick={incrementRestock} className="p-3 px-4 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <Plus size={16} />
                        </button>
                    </div>
                    
                    <button 
                        onClick={handleRestock}
                        className="flex-1 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                    <Plus size={18} /> Add Stock
                    </button>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {/* IMPROVED USAGE CARD */}
             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col justify-between overflow-hidden relative">
                <div className="relative z-10">
                    <p className="text-xs text-gray-400 mb-1">Monthly Usage</p>
                    <div className="flex items-end gap-2">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">420</p>
                        <span className="flex items-center text-green-500 text-xs font-bold mb-1 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                           <TrendingUp size={12} className="mr-1" /> 12%
                        </span>
                    </div>
                </div>
                
                {/* Mini Sparkline Chart */}
                <div className="absolute bottom-0 left-0 right-0 h-10 opacity-50">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparklineData}>
                            <defs>
                                <linearGradient id="colorSpark" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="val" stroke="#22c55e" strokeWidth={2} fill="url(#colorSpark)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
             </div>
             
             {/* CONFIG CARD */}
             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 relative group transition-all">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-blue-500">
                        <Settings size={16} />
                        <span className="text-xs font-bold uppercase">Config</span>
                    </div>
                    {!isEditingSettings && (
                         <button 
                            onClick={() => setIsEditingSettings(true)}
                            className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Settings size={14} />
                        </button>
                    )}
                </div>

                {isEditingSettings ? (
                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] text-gray-400 block mb-1">Min (Threshold)</label>
                            <input 
                                type="number" 
                                className="w-full p-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded dark:text-white"
                                value={newThreshold}
                                onChange={(e) => setNewThreshold(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-400 block mb-1">Max (Target)</label>
                            <input 
                                type="number" 
                                className="w-full p-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded dark:text-white"
                                value={newTarget}
                                onChange={(e) => setNewTarget(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 pt-1">
                             <button onClick={handleUpdateSettings} className="flex-1 py-1.5 bg-green-100 text-green-600 text-xs font-bold rounded hover:bg-green-200">Save</button>
                             <button onClick={() => setIsEditingSettings(false)} className="flex-1 py-1.5 bg-red-100 text-red-600 text-xs font-bold rounded hover:bg-red-200">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* THRESHOLD ROW */}
                        <div>
                             <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle size={14} className="text-orange-500" />
                                <span className="text-[10px] text-gray-400 uppercase font-bold">Min Threshold</span>
                             </div>
                             <p className="text-lg font-bold text-gray-900 dark:text-white pl-6">{item.low_stock_threshold}</p>
                        </div>
                        
                        {/* TARGET ROW */}
                        <div>
                             <div className="flex items-center gap-2 mb-1">
                                <Target size={14} className="text-blue-500" />
                                <span className="text-[10px] text-gray-400 uppercase font-bold">Target Max</span>
                             </div>
                             <p className="text-lg font-bold text-gray-900 dark:text-white pl-6">{item.target_capacity || 100}</p>
                        </div>
                    </div>
                )}
             </div>
          </div>
        </div>

        {/* Right Column: Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 h-96 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Stock Level History</h3>
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                    {['7D', '1M', '6M', '1Y'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                timeRange === range 
                                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="stock" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorStock)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
             <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
             <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {activities.map((act) => (
                    <div key={act.id} className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0 animate-fadeIn">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${act.change > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
                                {act.change > 0 ? <Plus size={16}/> : <TrendingDown size={16}/>}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{act.desc}</p>
                                <p className="text-xs text-gray-500">{act.time}</p>
                            </div>
                        </div>
                        <span className={`font-bold ${act.change > 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                            {act.change > 0 ? '+' : ''}{act.change} units
                        </span>
                    </div>
                ))}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}