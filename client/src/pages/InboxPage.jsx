import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { User, Send, MessageSquare, ArrowLeft, Search, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function InboxPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [replyText, setReplyText] = useState("");
  
  const [activeMessages, setActiveMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    axios.get('http://localhost:5000/api/inbox/1')
      .then(res => setConversations(res.data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedContact) {
      setActiveMessages([
        { id: 1, sender: 'them', text: `Hi, I have a question about my appointment.`, time: '10:00 AM' },
        { id: 2, sender: 'me', text: `Sure, ${selectedContact.name}. How can I help?`, time: '10:05 AM' },
        { id: 3, sender: 'them', text: selectedContact.last_message || "Can I reschedule?", time: '10:10 AM' },
      ]);
    }
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  const handleReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const newMessage = {
      id: Date.now(),
      sender: 'me',
      text: replyText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setActiveMessages((prev) => [...prev, newMessage]);
    setReplyText(""); 
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 transition-colors overflow-hidden">
      
      {/* --- LEFT SIDEBAR (List) --- 
         HIDDEN on Mobile IF a contact is selected
      */}
      <div className={`
        w-full md:w-1/3 min-w-[320px] border-r border-gray-200 dark:border-gray-700 flex-col bg-white dark:bg-gray-900 z-10
        ${selectedContact ? 'hidden md:flex' : 'flex'} 
      `}>
        
        {/* --- COMPACT HEADER --- */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-4 bg-gray-50 dark:bg-gray-800/30">
           
           {/* Top Row: Nav Icons */}
           <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link to="/" className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm transition-all" title="Back to Dashboard">
                  <ArrowLeft size={20} />
              </Link>
              {/* Title Row */}
              <div className="flex items-center gap-3 mt-1">
                    <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <h1 className="font-bold text-2xl text-gray-900 dark:text-white leading-none">Inbox</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Recent conversations</p>
                    </div>
              </div>
            </div>
              <ThemeToggle className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm transition-all" />
           </div>


           {/* Search Row */}
           <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search messages..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none dark:text-white transition-all shadow-sm"
                />
            </div>
        </div>
        
        {/* List */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {conversations.map(conv => (
            <div 
              key={conv.contact_id}
              onClick={() => setSelectedContact(conv)}
              className={`p-4 border-b border-gray-50 dark:border-gray-800 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800/50 relative group
                ${selectedContact?.contact_id === conv.contact_id 
                    ? 'bg-blue-50/50 dark:bg-blue-900/10' 
                    : ''}
              `}
            >
              {selectedContact?.contact_id === conv.contact_id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
              )}

              <div className="flex justify-between mb-1">
                <span className={`font-semibold ${selectedContact?.contact_id === conv.contact_id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {conv.name}
                </span>
                <span className="text-xs text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  {new Date(conv.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate pr-4">
                {conv.last_message}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* --- RIGHT SIDE (Chat Window) --- 
         HIDDEN on Mobile UNLESS a contact is selected
      */}
      <div className={`
        flex-1 flex-col bg-gray-50 dark:bg-gray-950 relative
        ${selectedContact ? 'flex' : 'hidden md:flex'}
      `}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 shadow-sm z-10 sticky top-0">
              
              {/* MOBILE BACK BUTTON */}
              <button 
                onClick={() => setSelectedContact(null)}
                className="md:hidden p-2 -ml-2 text-gray-500 dark:text-gray-400"
              >
                <ChevronLeft size={24} />
              </button>

              <div className="bg-linear-to-br from-blue-500 to-blue-600 h-10 w-10 rounded-full flex items-center justify-center text-white shadow-md shrink-0">
                  <User size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-gray-900 dark:text-white text-base truncate">{selectedContact.name}</h2>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selectedContact.email}</p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 md:space-y-6 custom-scrollbar">
               {activeMessages.map((msg) => {
                 const isMe = msg.sender === 'me';
                 return (
                   <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                      <div className={`max-w-[85%] md:max-w-[70%] relative group`}>
                        <div 
                            className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed wrap-break-word
                            ${isMe 
                                ? 'bg-blue-600 text-white rounded-tr-sm' 
                                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-tl-sm'}
                            `}
                        >
                            {msg.text}
                        </div>
                        <span className={`text-[10px] text-gray-400 mt-1 block ${isMe ? 'text-right' : 'text-left'}`}>
                            {msg.time}
                        </span>
                      </div>
                   </div>
                 );
               })}
               <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 md:p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 safe-area-bottom">
              <form onSubmit={handleReply} className="flex gap-2 max-w-4xl mx-auto">
                <input 
                  type="text" 
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl outline-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all text-sm"
                  placeholder="Type a message..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  // Only autoFocus on desktop to prevent keyboard jumping on mobile
                  autoFocus={window.innerWidth > 768}
                />
                <button 
                    type="submit" 
                    disabled={!replyText.trim()}
                    className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shrink-0"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty State (Hidden on mobile via CSS class above, shown on desktop) */
          <div className="hidden md:flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50 dark:bg-gray-950">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <MessageSquare size={40} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}