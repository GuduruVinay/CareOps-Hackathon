import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, AlertTriangle, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const WORKSPACE_ID = 1;

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = () => {
    axios.get(`http://localhost:5000/api/inventory/${WORKSPACE_ID}`)
      .then(res => {
        setInventory(res.data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  };

  const handleRestock = (itemId) => {
    axios.post(`http://localhost:5000/api/inventory/${itemId}/restock`, { amount: 10 })
      .then(() => fetchInventory())
      .catch(err => alert("Error restocking"));
  };

  if (loading) return <div className="p-8 dark:bg-gray-900 dark:text-white min-h-screen">Loading inventory...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 transition-colors">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-gray-500 dark:text-gray-400">Track your supplies</p>
        </div>
        <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            &larr; Back to Dashboard
            </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inventory.map((item) => {
          const isLow = item.quantity < item.low_stock_threshold;
          return (
            <div key={item.id} className={`bg-white dark:bg-gray-800 p-6 rounded-xl border ${isLow ? 'border-red-300 dark:border-red-800 shadow-red-100 dark:shadow-none' : 'border-gray-200 dark:border-gray-700 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${isLow ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-blue-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400'}`}>
                  <Package size={24} />
                </div>
                {isLow && (
                  <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle size={12} /> LOW STOCK
                  </span>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{item.item_name}</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">units available</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Threshold: {item.low_stock_threshold}</p>

              <button 
                onClick={() => handleRestock(item.id)}
                className="mt-6 w-full py-2 flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
              >
                <Plus size={16} /> Restock (+10)
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}