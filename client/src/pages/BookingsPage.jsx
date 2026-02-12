import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`http://localhost:5000/api/bookings/1`)
      .then(response => {
        setBookings(response.data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  if (loading) return <div className="p-8 dark:bg-gray-900 dark:text-white min-h-screen">Loading bookings...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 transition-colors">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bookings</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your schedule</p>
        </div>
        <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            &larr; Back to Dashboard
            </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Customer</th>
              <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Service</th>
              <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Date & Time</th>
              <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No bookings yet.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-gray-900 dark:text-white">{booking.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{booking.email}</div>
                  </td>
                  <td className="p-4">
                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 py-1 px-3 rounded-full text-xs font-semibold">
                      {booking.service_type}
                    </span>
                  </td>
                  <td className="p-4 flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Calendar size={16} />
                    {new Date(booking.start_time).toLocaleDateString()} 
                    <Clock size={16} className="ml-2" />
                    {new Date(booking.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="p-4">
                     <span className={`py-1 px-3 rounded-full text-xs font-semibold ${
                        booking.status === 'CONFIRMED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                     }`}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}