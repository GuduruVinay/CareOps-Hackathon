import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, AlertTriangle, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hardcoded Workspace ID
  const WORKSPACE_ID = 1;

  useEffect(() => {
    // We need to fetch inventory. 
    // Since we didn't make a dedicated GET route for this yet, let's add a quick fetch
    // OR just use the dashboard data if we were lazy. 
    // BUT, let's do it right. We need a new route.
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
    // Simple "Restock" button that adds 10 items
    axios.post(`http://localhost:5000/api/inventory/${itemId}/restock`, { amount: 10 })
      .then(() => fetchInventory()) // Refresh list
      .catch(err => alert("Error restocking"));
  };

  if (loading) return <div className="p-8">Loading inventory...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500">Track your supplies</p>
        </div>
        <Link to="/" className="text-blue-600 hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inventory.map((item) => {
          const isLow = item.quantity < item.low_stock_threshold;
          return (
            <div key={item.id} className={`bg-white p-6 rounded-xl border ${isLow ? 'border-red-300 shadow-red-100' : 'border-gray-200 shadow-sm'} shadow-sm`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${isLow ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  <Package size={24} />
                </div>
                {isLow && (
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle size={12} /> LOW STOCK
                  </span>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-gray-900">{item.item_name}</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{item.quantity}</span>
                <span className="text-sm text-gray-500">units available</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Threshold: {item.low_stock_threshold}</p>

              <button 
                onClick={() => handleRestock(item.id)}
                className="mt-6 w-full py-2 flex items-center justify-center gap-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
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