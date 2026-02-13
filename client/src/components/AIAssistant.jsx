import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Mic, Send, X, MessageSquare, RotateCcw, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AIAssistant({ context = 'customer' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFAQs, setShowFAQs] = useState(true);
  
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const audioRef = useRef(new Audio('/blip.mp3'));
  
  const playBlip = () => {
    try {
      audioRef.current.volume = 0.5;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {}); 
    } catch (e) { /* Ignore audio errors */ }
  };

  const initialMessage = { 
    sender: 'bot', 
    text: context === 'admin' 
      ? "Admin Assistant Online. How can I help you manage the workspace?" 
      : "Hello! I'm your CareOps assistant. How can I help you schedule today?" 
  };

  // --- UPDATED FAQS FOR REAL DATA QUERIES ---
  const FAQS = {
    customer: [
      { label: "Book an appointment", query: "I want to book an appointment" },
      { label: "Check pricing", query: "How much does it cost?" },
      { label: "Available slots?", query: "When are you available?" },
      { label: "Reschedule booking", query: "I need to reschedule" },
      { label: "Contact Support", query: "Contact support", highlight: true },
    ],
    admin: [
      { label: "Show today's bookings", query: "Show me today's bookings" },
      { label: "Check Low Stock", query: "Show low stock items" },
      { label: "Unread Messages", query: "Do I have unread messages?" },
      { label: "Inventory Summary", query: "Give me an inventory summary" }, // Changed from "Go to Inventory"
      { label: "System Status", query: "System status", highlight: true },
    ]
  };

  const currentFaqs = FAQS[context] || FAQS.customer;

  useEffect(() => {
    setMessages([initialMessage]);
    setShowFAQs(true);
  }, [context]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showFAQs, loading]);

  const handleRestart = () => {
    setMessages([initialMessage]);
    setShowFAQs(true);
    setInput("");
    playBlip();
  };

  const handleSend = async (textOverride = null) => {
    const query = textOverride || input;
    if (!query.trim()) return;

    // 1. User Message
    setShowFAQs(false);
    setMessages(prev => [...prev, { sender: 'user', text: query }]);
    setInput("");
    setLoading(true);

    // 2. Client-Side Intercepts (Instant Replies)
    if (query.toLowerCase().includes('contact support')) {
        setTimeout(() => {
            setMessages(prev => [...prev, { 
                sender: 'bot', 
                text: "You can reach our support team at:",
                isContactInfo: true 
            }]);
            playBlip();
            setLoading(false);
        }, 600);
        return;
    }

    // 3. Backend Call (Real Data)
    try {
      const res = await axios.get(`http://localhost:5000/api/assistant`, {
        params: { query, context }
      });

      const botReply = res.data.reply;
      
      setTimeout(() => {
        setMessages(prev => [...prev, { sender: 'bot', text: botReply }]);
        playBlip();
        setLoading(false);

        // NOTE: Navigation Actions Removed as requested.
        // The bot now provides data directly in the chat.
      }, 600);

    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', text: "I'm having trouble reaching the server right now." }]);
      setLoading(false);
    }
  };

  const toggleListening = () => {
     alert("Voice features coming soon!");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {!isOpen && (
        <button 
            onClick={() => { setIsOpen(true); playBlip(); }}
            className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 animate-bounce-slow"
        >
            <MessageSquare size={28} />
        </button>
      )}

      {isOpen && (
        <div className="w-80 md:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col transition-all animate-slideUp" style={{height: '550px'}}>
            
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white shadow-md">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <MessageSquare size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-base">CareOps AI</h3>
                        <p className="text-xs text-blue-100 opacity-90">{context === 'admin' ? 'Admin Assistant' : 'Customer Support'}</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button onClick={handleRestart} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Restart Conversation">
                        <RotateCcw size={18} />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 scroll-smooth">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                        {msg.isContactInfo ? (
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-bl-none border border-gray-200 dark:border-gray-700 shadow-sm max-w-[85%]">
                                <p className="text-sm text-gray-700 dark:text-gray-200 mb-3">{msg.text}</p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-sm text-blue-600 dark:text-blue-400 font-medium p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <Mail size={16} />
                                        <span>support@careops.com</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-blue-600 dark:text-blue-400 font-medium p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <Phone size={16} />
                                        <span>+1 (555) 012-3456</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-line ${
                                msg.sender === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-white dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-none'
                            }`}>
                                {msg.text}
                            </div>
                        )}
                    </div>
                ))}

                {showFAQs && (
                  <div className="flex flex-wrap gap-2 mt-4 animate-fadeIn">
                    {currentFaqs.map((faq, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(faq.query)}
                        className={`text-xs px-4 py-2 rounded-full border transition-all active:scale-95 text-left font-medium ${
                          faq.highlight
                            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-md'
                            : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50 dark:bg-gray-800 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-gray-700'
                        }`}
                      >
                        {faq.label}
                      </button>
                    ))}
                  </div>
                )}

                {loading && (
                    <div className="flex justify-start animate-fadeIn">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-bl-none border border-gray-200 dark:border-gray-700 shadow-sm flex gap-1.5 items-center">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2 items-center">
                <button 
                    onClick={toggleListening}
                    className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                    <Mic size={20} />
                </button>
                
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask a question..."
                    className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all"
                />
                
                <button 
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
      )}
    </div>
  );
}