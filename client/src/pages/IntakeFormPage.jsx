import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Activity, Calendar, User, FileText, AlertTriangle } from 'lucide-react';
import LoadingThrobber from '../components/LoadingThrobber';
import ThemeToggle from '../components/ThemeToggle'; // ✅ Imported ThemeToggle
import { API_URL } from '../../config';

export default function IntakeFormPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    history: '',
    allergies: '',
    medications: '',
    consent: false
  });

  useEffect(() => {
    axios.get(`${API_URL}/api/booking/${id}`)
      .then(res => {
        if (!res.data || !res.data.id) {
            throw new Error("Booking not found");
        }
        setBooking(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setError('Invalid or expired link.');
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/bookings/${id}/intake`, formData);
      setSubmitted(true);
    } catch (err) {
      alert("Failed to submit form. Please try again.");
    }
  };

  // ✅ HELPER: Safe Date Parser
  const formatDateTime = (dateString) => {
    if (!dateString) return { date: 'Date Pending', time: '--:--' };
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { date: 'Invalid Date', time: '--:--' };

    return {
      date: date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (loading) return <LoadingThrobber />;
  
  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl text-center border border-red-100 dark:border-red-900/30">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Link Error</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">{error}</p>
        </div>
    </div>
  );

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-200">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Set!</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Thank you, <strong>{booking?.name}</strong>. We have received your information and look forward to seeing you.</p>
        </div>
      </div>
    );
  }

  // Use helper to safely format date
  const { date, time } = formatDateTime(booking?.start_time);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-200">
      
      <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors duration-200">
        
        {/* ✅ HEADER WITH TOGGLE */}
        <div className="bg-blue-600 p-6 text-white text-center relative overflow-hidden">
          {/* Toggle Button Positioned Absolute Top Right */}
          <div className="absolute top-4 right-4 z-20">
            <ThemeToggle className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm cursor-pointer" />
          </div>

          <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-blue-600 to-blue-700 opacity-50 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="inline-flex p-3 bg-white/20 rounded-xl mb-3 backdrop-blur-sm">
                <Activity size={32} />
            </div>
            <h1 className="text-2xl font-bold">Patient Intake Form</h1>
            <p className="text-blue-100 mt-1">Please complete this before your visit</p>
          </div>
        </div>

        {/* Booking Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/10 px-6 py-4 border-b border-blue-100 dark:border-blue-900/30 flex flex-col sm:flex-row justify-between gap-2 text-sm text-blue-800 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <User size={16} /> 
            <span className="font-semibold">{booking?.name || 'Guest'}</span> {/* Fallback for Name */}
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} /> 
            <span>{date} at {time}</span> {/* Safe Date Display */}
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          <div>
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <FileText size={18} className="text-blue-600 dark:text-blue-400" /> Medical History
            </label>
            <textarea 
              rows={3}
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
              placeholder="List any past surgeries or chronic conditions..."
              value={formData.history}
              onChange={e => setFormData({...formData, history: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Allergies</label>
            <input 
              type="text"
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g. Penicillin, Peanuts"
              value={formData.allergies}
              onChange={e => setFormData({...formData, allergies: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Current Medications</label>
            <input 
              type="text"
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g. Ibuprofen 200mg"
              value={formData.medications}
              onChange={e => setFormData({...formData, medications: e.target.value})}
            />
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 rounded-xl">
            <input 
              type="checkbox" 
              id="consent"
              required
              className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-blue-500 cursor-pointer"
              checked={formData.consent}
              onChange={e => setFormData({...formData, consent: e.target.checked})}
            />
            <label htmlFor="consent" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer leading-relaxed select-none">
              I certify that the information provided is accurate and I consent to the treatment procedures.
            </label>
          </div>

          <button 
            type="submit" 
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 flex justify-center items-center gap-2 cursor-pointer"
          >
            Submit Information <CheckCircle size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}