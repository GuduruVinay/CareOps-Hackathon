import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ArrowLeft, Mail, Shield, Plus, Check, X, Lock, ChevronDown 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import LoadingThrobber from '../components/LoadingThrobber';
import toast, { Toaster } from 'react-hot-toast';

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'Staff' });
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const WORKSPACE_ID = 1;

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/staff/${WORKSPACE_ID}`);
      setStaff(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      const defaultPerms = { inbox: true, bookings: true, forms: true, inventory: false };
      await axios.post(`${API_URL}/api/staff`, { 
        workspace_id: WORKSPACE_ID,
        ...newStaff,
        permissions: defaultPerms
      });
      toast.success('Invitation sent!');
      setShowInviteModal(false);
      setNewStaff({ name: '', email: '', role: 'Staff' });
      fetchStaff();
    } catch (err) {
      toast.error('Failed to invite staff');
    }
  };

  const togglePermission = async (user, permKey) => {
    if (user.role === 'Owner') return;
    
    const updatedPerms = { ...user.permissions, [permKey]: !user.permissions[permKey] };
    setStaff(prev => prev.map(s => s.id === user.id ? { ...s, permissions: updatedPerms } : s));

    try {
      await axios.put(`${API_URL}/api/staff/${user.id}`, { permissions: updatedPerms });
      toast.success('Permissions updated');
    } catch (err) {
      toast.error('Failed to update');
      fetchStaff(); 
    }
  };

  if (loading) return <LoadingThrobber />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 transition-colors duration-200">
      <Toaster position="bottom-right" />

      {/* HEADER (Responsive) */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
        <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-4">
              <Link to="/" className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Staff & Permissions</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Manage team access and roles</p>
              </div>
            </div>
            <div className="md:hidden">
                <ThemeToggle className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm" />
            </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
            <button onClick={() => setShowInviteModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 md:py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95">
                <Plus size={18} /> Invite Staff
            </button>
            <div className="hidden md:block">
                <ThemeToggle className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm" />
            </div>
        </div>
      </div>

      {/* --- DESKTOP VIEW (Table) --- */}
      <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Inbox</th>
                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Bookings</th>
                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Forms</th>
                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Inventory</th>
                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {staff.map((user) => (
                        <tr key={user.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm">{user.name.charAt(0)}</div>
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-white">{user.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Mail size={12} /> {user.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-5">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${user.role === 'Owner' ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}><Shield size={12} /> {user.role}</span>
                            </td>
                            {['inbox', 'bookings', 'forms', 'inventory'].map(key => (
                                <td key={key} className="p-5 text-center">
                                    <button onClick={() => togglePermission(user, key)} disabled={user.role === 'Owner'} className={`p-2 rounded-lg transition-all ${user.permissions[key] ? 'text-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40' : 'text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'} ${user.role === 'Owner' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        {user.role === 'Owner' ? <Lock size={16} /> : user.permissions[key] ? <Check size={16} /> : <X size={16} />}
                                    </button>
                                </td>
                            ))}
                            <td className="p-5 text-center"><span className={`text-xs font-bold px-2 py-1 rounded-full ${user.status === 'Active' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'}`}>{user.status}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- MOBILE/TABLET VIEW (Cards) --- */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        {staff.map((user) => (
            <div key={user.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative">
                {/* User Info Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm">{user.name.charAt(0)}</div>
                        <div>
                            <div className="font-semibold text-gray-900 dark:text-white">{user.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Mail size={12} /> {user.email}</div>
                        </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${user.status === 'Active' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'}`}>{user.status}</span>
                </div>

                {/* Role Badge */}
                <div className="mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${user.role === 'Owner' ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}><Shield size={12} /> {user.role}</span>
                </div>

                {/* Permissions Grid */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wide">Permissions</p>
                    <div className="grid grid-cols-4 gap-2">
                        {['inbox', 'bookings', 'forms', 'inventory'].map(key => (
                            <div key={key} className="flex flex-col items-center gap-2">
                                <button onClick={() => togglePermission(user, key)} disabled={user.role === 'Owner'} className={`w-full py-2 rounded-lg flex justify-center items-center transition-all ${user.permissions[key] ? 'text-green-600 bg-green-50 dark:bg-green-900/20 active:scale-95' : 'text-gray-400 bg-gray-100 dark:bg-gray-800 active:scale-95'} ${user.role === 'Owner' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {user.role === 'Owner' ? <Lock size={16} /> : user.permissions[key] ? <Check size={16} /> : <X size={16} />}
                                </button>
                                <span className="text-[10px] font-medium text-gray-500 capitalize">{key}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* INVITE MODAL (Same as before) */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700 animate-slideUp">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invite New Staff</h2>
                    <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
                </div>
                
                <form onSubmit={handleInvite} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                        <input type="text" required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} placeholder="Jane Doe" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                        <input type="email" required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} placeholder="jane@careops.com" />
                    </div>
                    
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                        <button type="button" onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white flex justify-between items-center text-left">
                            <span>{newStaff.role}</span>
                            <ChevronDown size={16} className={`transition-transform duration-200 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isRoleDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsRoleDropdownOpen(false)} />
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top">
                                    {['Staff', 'Manager'].map((role) => (
                                        <button key={role} type="button" onClick={() => { setNewStaff({...newStaff, role}); setIsRoleDropdownOpen(false); }} className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 ${newStaff.role === role ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {role}
                                            {newStaff.role === role && <Check size={16} />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    
                    <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg mt-4">Send Invitation</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}