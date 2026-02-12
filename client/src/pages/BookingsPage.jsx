import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hardcoded Workspace ID
  const WORKSPACE_ID = 1;

  useEffect(() => {
    // 1. Fetch bookings from the API endpoint we created earlier
    axios.get(`http://localhost:3000/api/bookings/${WORKSPACE_ID}`)
      .then(response => {
        setBookings(response.data);
        setLoading(false);
      })
      .catch(err => console.error("Failed to load bookings", err));
  }, []);

  if (loading) return <div className="p-8">Loading bookings...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500">Manage your schedule</p>
        </div>
        <Link to="/" className="text-blue-600 hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 text-sm font-semibold text-gray-600">Customer</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Service</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Date & Time</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500">
                  No bookings yet. Share your booking link!
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{booking.name}</div>
                    <div className="text-sm text-gray-500">{booking.email}</div>
                  </td>
                  <td className="p-4">
                    <span className="bg-blue-100 text-blue-700 py-1 px-3 rounded-full text-xs font-semibold">
                      {booking.service_type}
                    </span>
                  </td>
                  <td className="p-4 flex items-center gap-2 text-gray-600">
                    <Calendar size={16} />
                    {new Date(booking.start_time).toLocaleDateString()} 
                    <Clock size={16} className="ml-2" />
                    {new Date(booking.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="p-4">
                     <span className={`py-1 px-3 rounded-full text-xs font-semibold ${
                        booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                     }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View Details
                    </button>
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