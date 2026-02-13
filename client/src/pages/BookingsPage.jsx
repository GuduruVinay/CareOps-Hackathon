import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, ArrowLeft, Search, Mail, CheckCircle, XCircle, AlertCircle, CalendarRange, Filter, X, Stethoscope, MessageSquare, ClipboardList, HelpCircle, Bell, ExternalLink } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import toast, { Toaster } from 'react-hot-toast'; 
import ThemeToggle from '../components/ThemeToggle';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState('All');
  const [selectedDate, setSelectedDate] = useState(null);
  
  const [toastPosition, setToastPosition] = useState('bottom-right');

  const WORKSPACE_ID = 1;

  useEffect(() => {
    axios.get(`http://localhost:5000/api/bookings/${WORKSPACE_ID}`)
      .then(response => {
        const sorted = response.data.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
        setBookings(sorted);
        setFilteredBookings(sorted);
        setLoading(false);
      })
      .catch(err => console.error("Failed to load bookings", err));
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)');
    const updatePosition = (e) => setToastPosition(e.matches ? 'top-center' : 'bottom-right');
    updatePosition(media);
    media.addEventListener('change', updatePosition);
    return () => media.removeEventListener('change', updatePosition);
  }, []);

  const uniqueServices = ['All', ...new Set(bookings.map(b => b.service_type))];

  useEffect(() => {
    const lowerQuery = searchQuery.toLowerCase();
    
    const filtered = bookings.filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(lowerQuery) || b.email.toLowerCase().includes(lowerQuery);
      const matchesService = selectedService === 'All' || b.service_type === selectedService;
      
      let matchesDate = true;
      if (selectedDate) {
          const bookingDateStr = new Date(b.start_time).toDateString();
          const filterDateStr = selectedDate.toDateString();
          matchesDate = bookingDateStr === filterDateStr;
      }

      return matchesSearch && matchesService && matchesDate;
    });

    setFilteredBookings(filtered);
  }, [searchQuery, selectedService, selectedDate, bookings]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedService('All');
    setSelectedDate(null);
    toast('Filters cleared', { icon: '🧹' });
  };

  // --- NEW: ADD TO GOOGLE CALENDAR HELPER ---
  const addToGoogleCalendar = (booking) => {
    const startTime = new Date(booking.start_time);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Assume 1 hour duration
    
    const formatTime = (date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const details = `Appointment with ${booking.name}\nService: ${booking.service_type}\nEmail: ${booking.email}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(booking.service_type + " - " + booking.name)}&dates=${formatTime(startTime)}/${formatTime(endTime)}&details=${encodeURIComponent(details)}`;
    
    window.open(url, '_blank');
  };

  // --- UPDATED ACTIONS ---
  const handleRemind = async (booking) => {
      // 1. Trigger Backend Email/SMS
      const promise = axios.post(`http://localhost:5000/api/bookings/${booking.id}/remind`, { type: 'email' });
      
      toast.promise(promise, {
        loading: 'Sending reminder...',
        success: (res) => {
            // 2. Ask to add to Calendar after sending
            return (
                <span className="flex items-center gap-2">
                    Reminder sent! 
                    <button 
                        onClick={() => addToGoogleCalendar(booking)}
                        className="underline font-bold hover:text-blue-200"
                    >
                        Add to Calendar?
                    </button>
                </span>
            );
        },
        error: 'Failed to send reminder',
      }, {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
        duration: 5000, // Stay longer so they can click the button
      });
  };

  const handleMessage = (booking) => {
      toast.loading(`Opening chat with ${booking.name}...`, { duration: 1000 });
      setTimeout(() => {
        navigate('/inbox', { 
            state: { 
                startChat: {
                    name: booking.name,
                    email: booking.email,
                    id: booking.id 
                } 
            } 
        });
      }, 500); 
  };

  // --- BADGES ---
  const getServiceBadge = (serviceType) => {
    const type = serviceType.toLowerCase();
    let Icon = HelpCircle;
    let colorClass = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";

    if (type.includes('consultation')) {
        Icon = MessageSquare;
        colorClass = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    } else if (type.includes('checkup') || type.includes('general')) {
        Icon = Stethoscope;
        colorClass = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800";
    } else if (type.includes('follow')) {
        Icon = ClipboardList;
        colorClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${colorClass} whitespace-nowrap`}>
            <Icon size={12} /> {serviceType}
        </span>
    );
  };

  const getStatusBadge = (status) => {
    if (status === 'CONFIRMED') return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"><CheckCircle size={12} /> CONFIRMED</span>;
    if (status === 'CANCELLED') return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"><XCircle size={12} /> CANCELLED</span>;
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"><AlertCircle size={12} /> PENDING</span>;
  };

  if (loading) return <div className="p-8 min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-white">Loading bookings...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 transition-colors duration-200">
      <Toaster 
        position={toastPosition}
        toastOptions={{
            className: 'dark:bg-gray-800 dark:text-white bg-white text-gray-900',
            style: {
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
            success: {
                iconTheme: {
                    primary: '#10B981',
                    secondary: 'white',
                },
            },
        }}
      />

      <style>{`
        .react-datepicker {
            font-family: inherit;
            border: 1px solid #374151;
            background-color: #1f2937;
            color: #fff;
            border-radius: 0.75rem;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
        }
        .react-datepicker-popper { z-index: 50 !important; }
        .react-datepicker__header {
            background-color: #1f2937;
            border-bottom: none;
            padding-top: 15px;
        }
        .react-datepicker__current-month {
            color: #fff;
            font-weight: 700;
            font-size: 1rem;
            margin-bottom: 10px;
        }
        .react-datepicker__day-name {
            color: #9ca3af;
            width: 2rem;
            line-height: 2rem;
            margin: 0.2rem;
            text-transform: uppercase;
            font-size: 0.7rem;
            font-weight: 700;
        }
        .react-datepicker__day {
            color: #e5e7eb;
            width: 2rem;
            line-height: 2rem;
            margin: 0.2rem;
            border-radius: 50%;
            transition: background-color 0.2s;
        }
        .react-datepicker__day:hover {
            background-color: #374151 !important;
            color: #fff;
            border-radius: 50% !important;
        }
        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
            background-color: #2563eb !important;
            color: white !important;
            border-radius: 50% !important;
            font-weight: bold;
        }
        .react-datepicker__day--outside-month {
            color: #4b5563;
            pointer-events: none;
        }
        .react-datepicker__navigation { top: 12px; }
        .react-datepicker__navigation-icon::before {
            border-color: #9ca3af;
            border-width: 2px 2px 0 0;
            height: 7px;
            width: 7px;
        }
        .react-datepicker__triangle { display: none; }
      `}</style>

      {/* --- HEADER --- */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
        <div className="flex w-full xl:w-auto justify-between items-center">
            <div className="flex items-center gap-4">
            <Link to="/" className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm">
                <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none">
                    <CalendarRange size={24} />
                </div>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Bookings</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage patient schedule</p>
                </div>
            </div>
            </div>
            <div className="xl:hidden">
                <ThemeToggle className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm" />
            </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 md:w-64 w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search bookings..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none dark:text-white transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-48">
               <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
               <select 
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-blue-500 dark:text-white appearance-none cursor-pointer shadow-sm"
               >
                  {uniqueServices.map(s => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>

            <div className="relative w-full sm:w-48">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
                  <Calendar size={16} />
               </div>
               <DatePicker 
                  selected={selectedDate} 
                  onChange={(date) => setSelectedDate(date)} 
                  placeholderText="mm / dd / yyyy"
                  wrapperClassName="w-full"
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-blue-500 dark:text-white shadow-sm cursor-pointer"
                  calendarStartDay={1}
                  popperPlacement="bottom-start"
               />
            </div>
          </div>

          {(searchQuery || selectedService !== 'All' || selectedDate) && (
              <div className="flex w-full md:w-auto">
                <button 
                    onClick={clearFilters} 
                    className="w-full md:w-auto flex items-center justify-center gap-2 p-2.5 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all shadow-sm"
                >
                    <X size={18} />
                    <span className="md:hidden font-medium text-sm">Clear Filters</span>
                </button>
              </div>
          )}

          <div className="hidden xl:block w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>
          <div className="hidden xl:block">
             <ThemeToggle className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm" />
          </div>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      {filteredBookings.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="text-gray-400" size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No bookings found</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Try adjusting your search or filters.</p>
              <button onClick={clearFilters} className="mt-4 text-sm font-bold text-blue-600 hover:underline">Clear all filters</button>
          </div>
      ) : (
        <>
            {/* DESKTOP TABLE */}
            <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">Customer</th>
                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Service</th>
                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Date & Time</th>
                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Status</th>
                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center whitespace-nowrap w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/30 transition-colors group cursor-default">
                            <td className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm group-hover:scale-105 transition-transform shrink-0">
                                        {booking.name.charAt(0)}
                                    </div>
                                    <div className="text-left min-w-35">
                                        <div className="font-semibold text-gray-900 dark:text-white truncate">{booking.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                                            <Mail size={12} /> {booking.email}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-5 whitespace-nowrap">
                                <div className="flex justify-center">{getServiceBadge(booking.service_type)}</div>
                            </td>
                            <td className="p-5 whitespace-nowrap">
                                <div className="flex flex-col items-center gap-1">
                                    <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                                        <Calendar size={14} className="text-gray-400" />
                                        {new Date(booking.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <Clock size={14} className="text-gray-400" />
                                        {new Date(booking.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </td>
                            <td className="p-5 whitespace-nowrap text-center">{getStatusBadge(booking.status)}</td>
                            <td className="p-5 whitespace-nowrap">
                                <div className="flex justify-center gap-2"> 
                                    <button 
                                        onClick={() => handleRemind(booking)}
                                        className="p-2 text-gray-500 hover:text-blue-600 bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-900" 
                                        title="Send Reminder"
                                    >
                                        <Bell size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleMessage(booking)}
                                        className="p-2 text-gray-500 hover:text-green-600 bg-gray-100 dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors border border-transparent hover:border-green-100 dark:hover:border-green-900" 
                                        title="Message Customer"
                                    >
                                        <MessageSquare size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>

            {/* MOBILE & TABLET CARDS */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBookings.map((booking) => (
                    <div key={booking.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden hover:bg-blue-50/50 dark:hover:bg-gray-700/30 transition-colors">
                        <div className="absolute top-4 right-4">{getStatusBadge(booking.status)}</div>
                        <div className="flex items-center gap-4 mb-5 pr-20">
                            <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                {booking.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate">{booking.name}</h3>
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate mt-0.5">
                                    <Mail size={12} /> {booking.email}
                                </div>
                            </div>
                        </div>
                        <div className="h-px bg-gray-100 dark:bg-gray-700 mb-4"></div>
                        <div className="flex justify-between items-center mb-4">
                            <div>{getServiceBadge(booking.service_type)}</div>
                            <div className="text-right">
                                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white justify-end">
                                    <Calendar size={14} className="text-gray-400" />
                                    {new Date(booking.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 justify-end mt-1">
                                    <Clock size={12} className="text-gray-400" />
                                    {new Date(booking.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button 
                                onClick={() => handleRemind(booking)}
                                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-medium text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-colors"
                            >
                                <Bell size={14} /> Remind
                            </button>
                            <button 
                                onClick={() => handleMessage(booking)}
                                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-medium text-xs hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 transition-colors"
                            >
                                <MessageSquare size={14} /> Message
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </>
      )}
    </div>
  );
}