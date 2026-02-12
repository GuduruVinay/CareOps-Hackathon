import { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function BookingForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    service_type: 'Consultation',
  });
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [selectedTime, setSelectedTime] = useState(null);
  const [status, setStatus] = useState('idle');

  const timeSlots = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

  // --- HELPER: Check if a time slot has passed ---
  const isTimeSlotPast = (slotTime) => {
    const today = new Date();
    
    if (!selectedDate || selectedDate.setHours(0,0,0,0) > today.setHours(0,0,0,0)) return false;
    if (selectedDate.setHours(0,0,0,0) < today.setHours(0,0,0,0)) return true;

    const [slotHour, slotMinute] = slotTime.split(':').map(Number);
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();

    if (currentHour > slotHour) return true;
    if (currentHour === slotHour && currentMinute >= slotMinute) return true;

    return false;
  };

  // --- CALENDAR LOGIC ---
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    const today = new Date();
    if (currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()) return;
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateToCheck = new Date(year, month, day);
      const isPast = dateToCheck < today;
      const isSelected = selectedDate?.toDateString() === dateToCheck.toDateString();
      const isToday = today.toDateString() === dateToCheck.toDateString();

      days.push(
        <button
          key={day}
          type="button"
          disabled={isPast}
          onClick={() => { setSelectedDate(dateToCheck); setSelectedTime(null); }}
          className={`
            p-2 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all mx-auto
            ${isSelected ? 'bg-blue-600 text-white shadow-md' : ''}
            ${!isSelected && !isPast ? 'hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200' : ''}
            ${isPast ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : ''}
            ${isToday && !isSelected ? 'border border-blue-600 text-blue-600' : ''}
          `}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      alert("Please select a date and time");
      return;
    }
    setStatus('submitting');

    const finalDate = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':');
    finalDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    try {
      await axios.post('http://localhost:5000/api/bookings', {
        workspace_id: 1,
        ...formData,
        start_time: finalDate.toISOString(),
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
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg max-w-md w-full border border-gray-100 dark:border-gray-700 relative">
          <div className="absolute top-4 right-4">
             <ThemeToggle />
          </div>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">See you soon for your {formData.service_type}.</p>
          <button onClick={() => window.location.reload()} className="w-full py-3 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-colors">Book Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-200">
      
      <div className="bg-white dark:bg-gray-800 max-w-lg w-full rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors duration-200">
        
        {/* --- HEADER WITH INTEGRATED TOGGLE --- */}
        <div className="bg-blue-600 p-6 text-white relative">
          {/* Toggle Button Positioned Inside Header */}
          <div className="absolute top-4 right-4">
            <ThemeToggle className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm" />
          </div>
          
          <div className="text-center">
            <h1 className="text-xl font-bold">Book with Demo Clinic</h1>
            <p className="text-blue-100 text-sm mt-1">Select a time below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {/* --- CALENDAR SECTION --- */}
          <div>
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="font-bold text-gray-900 dark:text-white text-lg">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"><ChevronLeft size={20} /></button>
                <button type="button" onClick={handleNextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"><ChevronRight size={20} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-xs font-bold text-gray-400 uppercase tracking-wide">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-2">
              {generateCalendarDays()}
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-700" />

          {/* --- TIME SECTION --- */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-3">
              <Clock size={16} /> Select Time {selectedDate && `for ${selectedDate.toLocaleDateString()}`}
            </label>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {timeSlots.map((time) => {
                const isDisabled = isTimeSlotPast(time);
                const isSelected = selectedTime === time;
                
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setSelectedTime(time)}
                    className={`
                      py-2 px-1 rounded-lg text-sm font-medium border transition-all
                      ${isSelected 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'}
                      ${!isDisabled && !isSelected ? 'hover:border-blue-400' : ''}
                      ${isDisabled ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-dashed' : ''} 
                    `}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>

          {/* --- FORM FIELDS --- */}
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-2">
                <Briefcase size={16} /> Service Type
              </label>
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

            <input 
              type="text" 
              placeholder="Full Name" 
              required
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
            <input 
              type="email" 
              placeholder="Email Address" 
              required
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={status === 'submitting' || !selectedTime}
            className="w-full py-4 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'submitting' ? 'Processing...' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  );
}