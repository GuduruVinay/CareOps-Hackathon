import { useState } from 'react';
import axios from 'axios';
import { 
  CheckCircle, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Briefcase, 
  Clock, 
  User, 
  Mail, 
  ArrowRight 
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import AIAssistant from '../components/AIAssistant';

export default function PublicBookingForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    service_type: 'General Checkup', // Default first option
  });
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [selectedTime, setSelectedTime] = useState(null);
  const [status, setStatus] = useState('idle');

  const services = [
    { id: 'General Checkup', name: 'General Checkup', duration: '30 min', price: '$50' },
    { id: 'Consultation', name: 'Specialist Consultation', duration: '60 min', price: '$120' },
    { id: 'Follow-up', name: 'Follow-up Visit', duration: '15 min', price: '$30' }
  ];

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

  // --- HELPER: Generate Google Calendar URL ---
  const addToCalendarUrl = () => {
    if (!selectedDate || !selectedTime) return '#';
    
    const startTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    startTime.setHours(hours, minutes, 0, 0);

    // Calculate End Time based on Service Duration
    const service = services.find(s => s.name === formData.service_type) || services[0];
    const durationMinutes = parseInt(service.duration) || 30;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    const formatTime = (date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const details = `Service: ${formData.service_type}\nClient: ${formData.name}`;
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(formData.service_type + " with Demo Clinic")}&dates=${formatTime(startTime)}/${formatTime(endTime)}&details=${encodeURIComponent(details)}`;
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
            ${!isPast ? 'cursor-pointer' : 'cursor-not-allowed'}
            ${isSelected ? 'bg-blue-600 text-white shadow-md' : ''}
            ${!isSelected && !isPast ? 'hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200' : ''}
            ${isPast ? 'text-gray-300 dark:text-gray-600' : ''}
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
    if (!selectedDate || !selectedTime) return;
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
      setStep(4); // Success Step
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  // --- RENDER SUCCESS (STEP 4) ---
  if (step === 4) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 dark:bg-gray-900 p-6 text-center transition-colors">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg max-w-md w-full border border-gray-100 dark:border-gray-700 relative animate-fadeIn">
          <div className="absolute top-4 right-4">
             <ThemeToggle className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" />
          </div>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            See you soon for your <strong>{formData.service_type}</strong> on <strong>{selectedDate.toLocaleDateString()} at {selectedTime}</strong>.
          </p>

          <div className="space-y-3">
            {/* ADD TO CALENDAR BUTTON */}
            <a 
              href={addToCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
            >
              <CalendarIcon size={20} /> Add to Google Calendar
            </a>
            
            {/* BOOK ANOTHER BUTTON */}
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
            >
              Book Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-200">
      
      <div className="bg-white dark:bg-gray-800 max-w-2xl w-full rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors duration-200 flex flex-col min-h-150">
        
        {/* --- HEADER --- */}
        <div className="bg-blue-600 p-6 text-white relative">
          <div className="absolute top-4 right-4">
            <ThemeToggle className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm hover:cursor-pointer" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Book with CareOps</h1>
            <p className="text-blue-100 text-sm mt-1">
              Step {step} of 3
            </p>
          </div>
        </div>

        {/* --- STEP 1: SERVICE SELECTION --- */}
        {step === 1 && (
          <div className="p-6 flex-1 flex flex-col animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Briefcase size={20} /> Choose Service
            </h2>
            
            <div className="grid grid-cols-1 gap-3 mb-6">
              {services.map(s => (
                <button
                  key={s.id}
                  onClick={() => setFormData({...formData, service_type: s.name})}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex justify-between items-center cursor-pointer ${
                    formData.service_type === s.name 
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-600' 
                    : 'border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800'
                  }`}
                >
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">{s.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.duration}</div>
                  </div>
                  <div className="font-bold text-blue-600 dark:text-blue-400">{s.price}</div>
                </button>
              ))}
            </div>

            <div className="mt-auto flex justify-end">
              <button 
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Next Step <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 2: DATE & TIME --- */}
        {step === 2 && (
          <div className="p-6 flex-1 flex flex-col animate-fadeIn">
             {/* IMPROVED BACK BUTTON */}
             <button 
               type="button"
               onClick={() => setStep(1)} 
               className="group flex items-center gap-3 text-sm font-semibold text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 mb-6 transition-all self-start outline-none cursor-pointer"
             >
               <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 text-gray-400 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400 transition-colors">
                 <ChevronLeft size={18} strokeWidth={2.5} />
               </div>
               <span>Back to services</span>
             </button>
            
             <div className="flex flex-col md:flex-row gap-8">
                {/* CALENDAR */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <span className="font-bold text-gray-900 dark:text-white">
                      {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 cursor-pointer"><ChevronLeft size={20} /></button>
                      <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 cursor-pointer"><ChevronRight size={20} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 text-center mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-xs font-bold text-gray-400">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-y-2">
                    {generateCalendarDays()}
                  </div>
                </div>

                <div className="w-px bg-gray-200 dark:bg-gray-700 hidden md:block"></div>

                {/* TIME SLOTS */}
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    <Clock size={16} /> Available Times
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((time) => {
                      const isDisabled = isTimeSlotPast(time);
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={time}
                          disabled={isDisabled}
                          onClick={() => setSelectedTime(time)}
                          className={`
                            py-2 px-1 rounded-lg text-sm font-medium border transition-all
                            ${!isDisabled ? 'cursor-pointer' : 'cursor-not-allowed'}
                            ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'}
                            ${!isDisabled && !isSelected ? 'hover:border-blue-400' : ''}
                            ${isDisabled ? 'opacity-40 border-dashed' : ''} 
                          `}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                  {selectedTime && (
                     <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-800 dark:text-blue-200 text-center">
                        Selected: <strong>{selectedDate.toLocaleDateString()}</strong> at <strong>{selectedTime}</strong>
                     </div>
                  )}
                </div>
             </div>

             <div className="mt-auto flex justify-end pt-6">
              <button 
                onClick={() => setStep(3)}
                disabled={!selectedTime}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Next Step <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 3: DETAILS & CONFIRM --- */}
        {step === 3 && (
          <div className="p-6 flex-1 flex flex-col animate-fadeIn">
            {/* IMPROVED BACK BUTTON */}
            <button 
               type="button"
               onClick={() => setStep(2)} 
               className="group flex items-center gap-3 text-sm font-semibold text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 mb-6 transition-all self-start outline-none cursor-pointer"
             >
               <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 text-gray-400 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400 transition-colors">
                 <ChevronLeft size={18} strokeWidth={2.5} />
               </div>
               <span>Back to calendar</span>
             </button>
            
            {/* WRAPPED CONTENT FOR ALIGNMENT */}
            <div className="w-full max-w-md mx-auto">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Enter Your Details</h2>

              <form onSubmit={handleSubmit} className="space-y-4 w-full">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                   <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                        placeholder="John Doe"
                      />
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                   <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="email" 
                        required
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                        placeholder="john@example.com"
                      />
                   </div>
                 </div>

                 <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl mt-6 border border-gray-100 dark:border-gray-600">
                   <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm uppercase tracking-wide">Booking Summary</h4>
                   <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                      <span>Service:</span> <span className="font-medium">{formData.service_type}</span>
                   </div>
                   <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                      <span>Date:</span> <span className="font-medium">{selectedDate.toLocaleDateString()} at {selectedTime}</span>
                   </div>
                 </div>

                 <button 
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none mt-4 disabled:opacity-70 cursor-pointer"
                >
                  {status === 'submitting' ? 'Confirming...' : 'Confirm Booking'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
      <AIAssistant context="customer" />
    </div>
  );
}