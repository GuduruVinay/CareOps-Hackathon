import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar, Clock, ArrowLeft, Search, Mail, CheckCircle, XCircle, AlertCircle, 
  CalendarRange, Filter, X, Stethoscope, MessageSquare, ClipboardList, 
  HelpCircle, Bell, ChevronDown, Trash2, CalendarClock, AlertTriangle, 
  FileText, Check
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import toast, { Toaster } from 'react-hot-toast'; 
import ThemeToggle from '../components/ThemeToggle';
import LoadingThrobber from '../components/LoadingThrobber';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, booking: null });

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState('All');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [toastPosition, setToastPosition] = useState('bottom-right');
  const WORKSPACE_ID = 1;

  const fetchBookings = () => {
    axios.get(`http://localhost:5000/api/bookings/${WORKSPACE_ID}`)
      .then(response => {
        const sorted = response.data.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
        setBookings(sorted);
        setFilteredBookings(sorted);
        setLoading(false);
      })
      .catch(err => console.error("Failed to load bookings", err));
  };

  useEffect(() => { fetchBookings(); }, []);

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

  const addToGoogleCalendar = (booking) => {
    const startTime = new Date(booking.start_time);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); 
    const formatTime = (date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const details = `Appointment with ${booking.name}\nService: ${booking.service_type}\nEmail: ${booking.email}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(booking.service_type + " - " + booking.name)}&dates=${formatTime(startTime)}/${formatTime(endTime)}&details=${encodeURIComponent(details)}`;
    window.open(url, '_blank');
  };

  const handleRemind = async (booking) => {
      const promise = axios.post(`http://localhost:5000/api/bookings/${booking.id}/remind`, { type: 'email' });
      toast.promise(promise, {
        loading: 'Sending reminder...',
        success: (res) => (
            <span className="flex items-center gap-2">
                Reminder sent! 
                <button onClick={() => addToGoogleCalendar(booking)} className="underline font-bold hover:text-blue-200">Calendar?</button>
            </span>
        ),
        error: 'Failed to send reminder',
      }, { style: { borderRadius: '10px', background: '#333', color: '#fff' } });
  };

  const handleMessage = (booking) => {
      toast.loading(`Opening chat...`, { duration: 1000 });
      setTimeout(() => navigate('/inbox', { state: { startChat: { name: booking.name, email: booking.email, id: booking.id } } }), 500); 
  };

  const handleReschedule = (booking) => {
      toast.success(`Reschedule link sent to ${booking.email}`, { icon: '📅' });
  };

  const initiateCancel = (booking) => setConfirmModal({ isOpen: true, booking });

  const proceedWithCancel = async () => {
    if (!confirmModal.booking) return;
    const booking = confirmModal.booking;
    setConfirmModal({ isOpen: false, booking: null }); 
    const promise = axios.put(`http://localhost:5000/api/bookings/${booking.id}/cancel`);
    toast.promise(promise, {
        loading: 'Cancelling...',
        success: () => { fetchBookings(); return 'Booking cancelled.'; },
        error: 'Failed to cancel.',
    });
  };

  const getServiceBadge = (serviceType) => {
    const type = serviceType.toLowerCase();
    let Icon = HelpCircle;
    let colorClass = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
    if (type.includes('consultation')) { Icon = MessageSquare; colorClass = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"; } 
    else if (type.includes('checkup')) { Icon = Stethoscope; colorClass = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800"; } 
    else if (type.includes('follow')) { Icon = ClipboardList; colorClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"; }
    return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${colorClass} whitespace-nowrap`}><Icon size={12} /> {serviceType}</span>;
  };

  const getStatusBadge = (status) => {
    if (status === 'CONFIRMED') return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"><CheckCircle size={12} /> CONFIRMED</span>;
    if (status === 'CANCELLED') return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"><XCircle size={12} /> CANCELLED</span>;
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"><AlertCircle size={12} /> PENDING</span>;
  };

  // --- NEW: INTAKE BADGE HELPER ---
  const getIntakeBadge = (status) => {
    if (status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md border border-green-100 dark:border-green-800">
          <Check size={12} /> Done
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-800">
        <Clock size={12} /> Pending
      </span>
    );
  };

  if (loading) return <LoadingThrobber />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 transition-colors duration-200 relative">
      <Toaster position={toastPosition} toastOptions={{ className: 'dark:bg-gray-800 dark:text-white bg-white text-gray-900', style: { borderRadius: '12px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' } }} />
      
      {/* MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-700 transform transition-all scale-100">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={24} /></div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Cancel Appointment?</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Are you sure you want to cancel the <strong>{confirmModal.booking.service_type}</strong>?</p>
                    <div className="flex gap-3 w-full">
                        <button onClick={() => setConfirmModal({ isOpen: false, booking: null })} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600">Keep It</button>
                        <button onClick={proceedWithCancel} className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg">Yes, Cancel</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* HEADER & FILTERS (Same as before) */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
        <div className="flex w-full xl:w-auto justify-between items-center">
            <div className="flex items-center gap-4">
                <Link to="/" className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"><ArrowLeft size={20} /></Link>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none"><CalendarRange size={24} /></div>
                    <div><h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Bookings</h1><p className="text-sm text-gray-500 dark:text-gray-400">Manage patient schedule</p></div>
                </div>
            </div>
            <div className="xl:hidden"><ThemeToggle className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm" /></div>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 md:w-64 w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input type="text" placeholder="Search bookings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none dark:text-white transition-all shadow-sm" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-48">
               {isDropdownOpen && <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />}
               <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white shadow-sm flex items-center justify-between transition-all"><span className="truncate">{selectedService}</span><ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} /></button>
               {isDropdownOpen && (<div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top"><div className="max-h-60 overflow-y-auto py-1">{uniqueServices.map(s => (<button key={s} onClick={() => { setSelectedService(s); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between group ${selectedService === s ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><span>{s}</span>{selectedService === s && <CheckCircle size={14} className="text-blue-600 dark:text-blue-400" />}</button>))}</div></div>)}
               <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10"><Filter size={16} /></div>
            </div>
            <div className="relative w-full sm:w-48">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10"><Calendar size={16} /></div>
               <DatePicker selected={selectedDate} onChange={(date) => setSelectedDate(date)} placeholderText="mm / dd / yyyy" wrapperClassName="w-full" className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-blue-500 dark:text-white shadow-sm cursor-pointer" calendarStartDay={1} popperPlacement="bottom-start" />
            </div>
          </div>
          {(searchQuery || selectedService !== 'All' || selectedDate) && (<div className="flex w-full md:w-auto"><button onClick={clearFilters} className="w-full md:w-auto flex items-center justify-center gap-2 p-2.5 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all shadow-sm"><X size={18} /><span className="md:hidden font-medium text-sm">Clear Filters</span></button></div>)}
          <div className="hidden xl:block w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>
          <div className="hidden xl:block"><ThemeToggle className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm" /></div>
        </div>
      </div>

      {/* --- DESKTOP TABLE (UPDATED WITH INTAKE COL) --- */}
      {filteredBookings.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4"><Calendar className="text-gray-400" size={32} /></div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No bookings found</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Try adjusting your search or filters.</p>
              <button onClick={clearFilters} className="mt-4 text-sm font-bold text-blue-600 hover:underline">Clear all filters</button>
          </div>
      ) : (
        <>
            <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">Customer</th>
                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Service</th>
                        {/* NEW: Intake Column Header */}
                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Intake</th>
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
                                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm group-hover:scale-105 transition-transform shrink-0">{booking.name.charAt(0)}</div>
                                    <div className="text-left min-w-35">
                                        <div className="font-semibold text-gray-900 dark:text-white truncate">{booking.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 truncate"><Mail size={12} /> {booking.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-5 whitespace-nowrap"><div className="flex justify-center">{getServiceBadge(booking.service_type)}</div></td>
                            
                            {/* NEW: Intake Status Cell */}
                            <td className="p-5 whitespace-nowrap"><div className="flex justify-center">{getIntakeBadge(booking.intake_status)}</div></td>
                            
                            <td className="p-5 whitespace-nowrap">
                                <div className="flex flex-col items-center gap-1">
                                    <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white"><Calendar size={14} className="text-gray-400" />{new Date(booking.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                    <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Clock size={14} className="text-gray-400" />{new Date(booking.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                            </td>
                            <td className="p-5 whitespace-nowrap text-center">{getStatusBadge(booking.status)}</td>
                            <td className="p-5 whitespace-nowrap">
                                <div className="flex justify-center gap-2"> 
                                    <button onClick={() => handleMessage(booking)} className="p-2 text-gray-500 hover:text-green-600 bg-gray-100 dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors border border-transparent hover:border-green-100 dark:hover:border-green-900"><MessageSquare size={18} /></button>
                                    {booking.status !== 'CANCELLED' ? (
                                        <>
                                            <button onClick={() => handleRemind(booking)} className="p-2 text-gray-500 hover:text-blue-600 bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-900"><Bell size={18} /></button>
                                            <button onClick={() => initiateCancel(booking)} className="p-2 text-gray-500 hover:text-red-600 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900"><Trash2 size={18} /></button>
                                        </>
                                    ) : (
                                        <button onClick={() => handleReschedule(booking)} className="p-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors border border-amber-100 dark:border-amber-900"><CalendarClock size={18} /></button>
                                    )}
                                </div>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>
            
            {/* --- MOBILE LIST (UPDATED) --- */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBookings.map((booking) => (
                    <div key={booking.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden hover:bg-blue-50/50 dark:hover:bg-gray-700/30 transition-colors">
                        <div className="absolute top-4 right-4">{getStatusBadge(booking.status)}</div>
                        <div className="flex items-center gap-4 mb-5 pr-20">
                            <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">{booking.name.charAt(0)}</div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate">{booking.name}</h3>
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate mt-0.5"><Mail size={12} /> {booking.email}</div>
                            </div>
                        </div>
                        <div className="h-px bg-gray-100 dark:bg-gray-700 mb-4"></div>
                        <div className="flex justify-between items-center mb-4">
                            <div>{getServiceBadge(booking.service_type)}</div>
                            <div className="text-right">
                                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white justify-end"><Calendar size={14} className="text-gray-400" />{new Date(booking.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 justify-end mt-1"><Clock size={12} className="text-gray-400" />{new Date(booking.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                            </div>
                        </div>
                        
                        {/* NEW: Intake Status Row for Mobile */}
                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 p-2.5 rounded-lg mb-4">
                           <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                              <FileText size={14} /> Intake Form
                           </div>
                           {getIntakeBadge(booking.intake_status)}
                        </div>

                        <div className="grid grid-cols-4 gap-2 pt-2">
                            <button onClick={() => handleMessage(booking)} className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-medium text-xs hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 transition-colors"><MessageSquare size={14} /></button>
                            {booking.status !== 'CANCELLED' ? (
                                <>
                                    <button onClick={() => handleRemind(booking)} className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-medium text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-colors"><Bell size={14} /></button>
                                    <button onClick={() => initiateCancel(booking)} className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-medium text-xs hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                                </>
                            ) : (
                                <button onClick={() => handleReschedule(booking)} className="col-span-3 flex items-center justify-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium text-xs hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"><CalendarClock size={14} /> Reschedule</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </>
      )}
    </div>
  );
}