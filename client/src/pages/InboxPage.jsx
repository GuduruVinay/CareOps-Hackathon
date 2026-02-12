import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function InboxPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    axios.get('http://localhost:5000/api/inbox/1')
      .then(res => setConversations(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleReply = (e) => {
    e.preventDefault();
    if (!replyText) return;
    alert(`Mock Sent: "${replyText}"`);
    setReplyText("");
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* LEFT SIDEBAR */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <h1 className="font-bold text-lg text-gray-800 dark:text-white">Inbox</h1>
          <div className="flex gap-2 items-center">
             <ThemeToggle />
             <Link to="/" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Exit</Link>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1">
          {conversations.map(conv => (
            <div 
              key={conv.contact_id}
              onClick={() => setSelectedContact(conv)}
              className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selectedContact?.contact_id === conv.contact_id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600' : ''}`}
            >
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{conv.name}</span>
                <span className="text-xs text-gray-400">
                  {new Date(conv.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{conv.last_message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE: Chat Window */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 shadow-sm">
              <div className="bg-blue-100 dark:bg-gray-700 p-2 rounded-full text-blue-600 dark:text-blue-400"><User size={20} /></div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">{selectedContact.name}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedContact.email}</p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
               {/* Incoming */}
               <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg rounded-tl-none shadow-sm border border-gray-200 dark:border-gray-700 max-w-md">
                    <p className="text-gray-800 dark:text-gray-200">Hi, do you treat lower back pain?</p>
                    <span className="text-xs text-gray-400 mt-1 block">10:00 AM</span>
                  </div>
               </div>
               {/* Outgoing */}
               <div className="flex justify-end">
                  <div className="bg-blue-600 dark:bg-blue-700 p-3 rounded-lg rounded-tr-none shadow-sm max-w-md text-white">
                    <p>Yes Sarah, we specialize in that. Would you like to book?</p>
                    <span className="text-blue-200 text-xs mt-1 block text-right">11:00 AM</span>
                  </div>
               </div>
               {/* Incoming Latest */}
               <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg rounded-tl-none shadow-sm border border-gray-200 dark:border-gray-700 max-w-md">
                    <p className="text-gray-800 dark:text-gray-200">{selectedContact.last_message}</p>
                    <span className="text-xs text-gray-400 mt-1 block">Just now</span>
                  </div>
               </div>
            </div>

            {/* Reply Box */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <form onSubmit={handleReply} className="flex gap-2">
                <input 
                  type="text" 
                  className="flex-1 p-3 border border-gray-300 dark:border-gray-700 rounded-lg outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <button type="submit" className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700">
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
}