import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Activity, Calendar, User, FileText } from 'lucide-react';
import LoadingThrobber from '../components/LoadingThrobber';

export default function IntakeFormPage() {
  const { id } = useParams(); // Get booking ID from URL
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    history: '',
    allergies: '',
    medications: '',
    consent: false
  });

  useEffect(() => {
    // Fetch booking details to verify link and show name
    axios.get(`http://localhost:5000/api/bookings/${id}`)
      .then(res => {
        setBooking(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Invalid or expired link.');
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`http://localhost:5000/api/bookings/${id}/intake`, formData);
      setSubmitted(true);
    } catch (err) {
      alert("Failed to submit form. Please try again.");
    }
  };

  if (loading) return <LoadingThrobber />;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">All Set!</h2>
          <p className="text-gray-500 mt-2">Thank you, <strong>{booking.name}</strong>. We have received your information and look forward to seeing you.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Brand Header */}
        <div className="bg-blue-600 p-6 text-white text-center">
          <div className="inline-flex p-3 bg-white/20 rounded-xl mb-3 backdrop-blur-sm">
            <Activity size={32} />
          </div>
          <h1 className="text-2xl font-bold">Patient Intake Form</h1>
          <p className="text-blue-100 mt-1">Please complete this before your visit</p>
        </div>

        {/* Booking Summary */}
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex flex-col sm:flex-row justify-between gap-2 text-sm text-blue-800">
          <div className="flex items-center gap-2">
            <User size={16} /> <span>{booking.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} /> 
            <span>
              {new Date(booking.start_time).toLocaleDateString()} at {new Date(booking.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <FileText size={18} className="text-blue-600" /> Medical History
            </label>
            <textarea 
              rows={3}
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="List any past surgeries or chronic conditions..."
              value={formData.history}
              onChange={e => setFormData({...formData, history: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Allergies</label>
            <input 
              type="text"
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g. Penicillin, Peanuts"
              value={formData.allergies}
              onChange={e => setFormData({...formData, allergies: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Current Medications</label>
            <input 
              type="text"
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g. Ibuprofen 200mg"
              value={formData.medications}
              onChange={e => setFormData({...formData, medications: e.target.value})}
            />
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
            <input 
              type="checkbox" 
              id="consent"
              required
              className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              checked={formData.consent}
              onChange={e => setFormData({...formData, consent: e.target.checked})}
            />
            <label htmlFor="consent" className="text-sm text-gray-600 cursor-pointer">
              I certify that the information provided is accurate and I consent to the treatment procedures.
            </label>
          </div>

          <button 
            type="submit" 
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg active:scale-95"
          >
            Submit Information
          </button>
        </form>
      </div>
    </div>
  );
}