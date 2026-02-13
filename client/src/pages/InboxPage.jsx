import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Send, Phone, Video, MoreVertical, ArrowLeft, Trash2, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

// Mock Data
const MOCK_CONVERSATIONS = [
  {
    id: 1,
    user: { name: "Sarah Connor", email: "sarah@example.com", avatar: "S", status: "Online" },
    unread: 2,
    messages: [
      { id: 1, text: "Yes please, sending my info now.", sender: "user", time: "08:46 AM" }
    ]
  },
  {
    id: 2,
    user: { name: "John Doe", email: "john@gmail.com", avatar: "J", status: "Offline" },
    unread: 0,
    messages: [
      { id: 1, text: "Can we reschedule?", sender: "user", time: "Yesterday" }
    ]
  }
];

export default function InboxPage() {
  const [conversations, setConversations] = useState(() => {
    const savedData = localStorage.getItem('inbox_conversations');
    return savedData ? JSON.parse(savedData) : MOCK_CONVERSATIONS;
  });

  const [activeConversation, setActiveConversation] = useState(null);
  const [inputText, setInputText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('inbox_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  useEffect(() => {
    if (location.state?.startChat) {
      const target = location.state.startChat;
      const targetEmail = target.email.toLowerCase();

      setConversations(prev => {
        const existing = prev.find(c => c.user.email.toLowerCase() === targetEmail);
        
        if (existing) {
          setActiveConversation(existing);
          return prev;
        } else {
          const newChat = {
            id: Date.now(),
            user: { 
              name: target.name, 
              email: target.email, 
              avatar: target.name.charAt(0).toUpperCase(), 
              status: "Online" 
            },
            unread: 0,
            messages: [] 
          };
          setActiveConversation(newChat);
          return [newChat, ...prev];
        }
      });
      
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const handleSelectChat = (chat) => {
    const updatedChat = { ...chat, unread: 0 };
    setActiveConversation(updatedChat);
    setConversations(prev => prev.map(c => c.id === chat.id ? updatedChat : c));
    setShowMenu(false); 
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const newMessage = {
      id: Date.now(),
      text: inputText,
      sender: "me",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations(prev => {
      return prev.map(c => {
        if (c.id === activeConversation.id) {
          return { ...c, messages: [...c.messages, newMessage] };
        }
        return c;
      });
    });
    
    setActiveConversation(prev => ({
        ...prev,
        messages: [...prev.messages, newMessage]
    }));
    
    setInputText("");
  };

  const handleDeleteChat = () => {
    if (!activeConversation) return;
    
    setConversations(prev => prev.filter(c => c.id !== activeConversation.id));
    setActiveConversation(null);
    setShowMenu(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      
      {/* --- LEFT SIDEBAR --- */}
      <div className={`w-full md:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
        
        {/* HEADER - FIXED HEIGHT FOR ALIGNMENT */}
        <div className="h-18 px-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-gray-500 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            
            <div className="flex items-center gap-3">
               <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none">
                  <MessageSquare size={20} />
               </div>
               <div>
                  <h1 className="text-base font-bold text-gray-900 dark:text-white leading-none">Inbox</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Recent conversations</p>
               </div>
            </div>
          </div>
          
          <ThemeToggle className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm" />
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search messages..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
             <div className="text-center text-gray-400 mt-10 text-sm">No conversations found</div>
          ) : (
            conversations.map((chat) => (
              <div 
                key={chat.id}
                onClick={() => handleSelectChat(chat)}
                className={`p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 ${activeConversation?.id === chat.id ? 'bg-blue-50 dark:bg-gray-700 border-l-4 border-l-blue-500' : ''}`}
              >
                <div className="relative w-12 h-12 shrink-0">
                  <div className="w-full h-full rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                    {chat.user.avatar}
                  </div>
                  {chat.user.status === 'Online' && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className={`text-sm truncate ${chat.unread > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-700 dark:text-gray-200'}`}>
                        {chat.user.name}
                    </h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{chat.messages[chat.messages.length - 1]?.time}</span>
                  </div>
                  
                  <div className="flex justify-between items-center mt-0.5">
                    <p className={`text-sm truncate ${chat.unread > 0 ? 'text-gray-800 dark:text-gray-100 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                        {chat.messages[chat.messages.length - 1]?.text || "New conversation"}
                    </p>
                    
                    {chat.unread > 0 && (
                        <span className="ml-2 flex items-center justify-center w-5 h-5 bg-green-500 text-white text-[10px] font-bold rounded-full">
                            {chat.unread}
                        </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- RIGHT MAIN CHAT AREA --- */}
      <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900 ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
        
        {activeConversation ? (
          <>
            {/* CHAT HEADER - FIXED HEIGHT FOR ALIGNMENT */}
            <div className="h-18 px-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 shadow-sm z-10 shrink-0">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveConversation(null)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                  {activeConversation.user.avatar}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">{activeConversation.user.name}</h2>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${activeConversation.user.status === 'Online' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{activeConversation.user.status}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-1 text-gray-400">
                <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><Phone size={20} /></button>
                <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><Video size={20} /></button>
                
                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setShowMenu(!showMenu)} 
                        className={`p-2.5 rounded-full transition-colors ${showMenu ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        <MoreVertical size={20} />
                    </button>
                    
                    {showMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 overflow-hidden py-1">
                            <button 
                                onClick={handleDeleteChat}
                                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                                <Trash2 size={16} /> Delete Conversation
                            </button>
                        </div>
                    )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-900 scroll-smooth">
              {activeConversation.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-5 py-3 shadow-sm text-sm ${
                    msg.sender === 'me' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-200 dark:border-gray-700'
                  }`}>
                    <p className="leading-relaxed">{msg.text}</p>
                    <p className={`text-[10px] mt-1 text-right ${msg.sender === 'me' ? 'text-blue-100' : 'text-gray-400'}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
              {activeConversation.messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <p>No messages yet. Say hi!</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message..." 
                  className="flex-1 bg-gray-100 dark:bg-gray-700 px-5 py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-gray-800 dark:text-white transition-all shadow-inner"
                />
                <button 
                    type="submit" 
                    disabled={!inputText.trim()}
                    className="p-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
               <Send size={32} className="text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Your Inbox</h3>
            <p className="max-w-xs mx-auto text-gray-500 dark:text-gray-400">Select a conversation from the left to start chatting or view your history.</p>
          </div>
        )}
      </div>
    </div>
  );
}