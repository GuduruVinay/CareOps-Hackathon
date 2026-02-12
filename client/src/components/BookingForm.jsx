import { useState } from 'react';
import axios from 'axios';
import { CheckCircle } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle'; // <--- 1. Import the toggle

export default function BookingForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    service_type: 'Consultation',
    start_time: '',
  });
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      await axios.post('http://localhost:5000/api/bookings', {
        workspace_id: 1,
        ...formData
      });
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 dark:bg-gray-900 p-6 text-center transition-colors">
        {/* Success Header with Toggle */}
        <div className="absolute top-4 right-4">
           <ThemeToggle />
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg max-w-md w-full border border-gray-100 dark:border-gray-700">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">We have sent a confirmation email to {formData.email}.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full py-3 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-colors"
          >
            Book Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-200 relative">
      
      {/* 2. Absolute Positioned Toggle Button (Top Right) */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="bg-white dark:bg-gray-800 max-w-md w-full rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors duration-200">
        <div className="bg-blue-600 p-6 text-white text-center">
          <h1 className="text-xl font-bold">Book with Demo Clinic</h1>
          <p className="text-blue-100 text-sm mt-1">Select a time below</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service</label>
            <select 
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
              value={formData.service_type}
              onChange={(e) => setFormData({...formData, service_type: e.target.value})}
            >
              <option>General Checkup</option>
              <option>Consultation</option>
              <option>Follow-up</option>
            </select>
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date & Time</label>
            <input 
              type="datetime-local" 
              required
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
              value={formData.start_time}
              onChange={(e) => setFormData({...formData, start_time: e.target.value})}
            />
          </div>

          {/* Contact Details */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Your Details</h3>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Full Name" 
                required
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
              <input 
                type="email" 
                placeholder="Email Address" 
                required
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={status === 'submitting'}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {status === 'submitting' ? 'Processing...' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  );
}