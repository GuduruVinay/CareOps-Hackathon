import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Mic, Send, X, MessageSquare, RotateCcw, Phone, Mail, MicOff, AlertCircle } from 'lucide-react';

export default function AIAssistant({ context = 'customer' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFAQs, setShowFAQs] = useState(true);
  
  useEffect(() => {
    const handleOpenEvent = () => {
      setIsOpen(true);
      // Optional: Play sound when opened via event
      playBlip(); 
    };

    window.addEventListener('open-ai-chat', handleOpenEvent);

    // Cleanup listener on unmount
    return () => window.removeEventListener('open-ai-chat', handleOpenEvent);
  }, []);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false); // NEW: Check Support
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(new Audio('/blip.mp3'));

  const playBlip = () => {
    try {
      audioRef.current.volume = 0.5;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {}); 
    } catch (e) { }
  };

  const initialMessage = { 
    sender: 'bot', 
    text: context === 'admin' 
      ? "Admin Assistant Online. How can I help you manage the workspace?" 
      : "Hello! I'm your CareOps assistant. How can I help you schedule today?" 
  };

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
      { label: "Inventory Summary", query: "Give me an inventory summary" },
      { label: "System Status", query: "System status", highlight: true },
    ]
  };

  const currentFaqs = FAQS[context] || FAQS.customer;

  // --- INITIALIZATION ---
  useEffect(() => {
    setMessages([initialMessage]);
    setShowFAQs(true);

    // BROWSER SUPPORT CHECK
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
           setInput(transcript);
           handleSend(transcript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
        setMessages(prev => [...prev, { sender: 'bot', text: "I couldn't hear you clearly. Please try again." }]);
      };
    } else {
      setIsSpeechSupported(false); // Firefox / Unsupported Browsers
    }
  }, [context]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showFAQs, loading, isListening]);

  // --- HANDLERS ---
  const handleRestart = () => {
    setMessages([initialMessage]);
    setShowFAQs(true);
    setInput("");
    playBlip();
  };

  const handleSend = async (textOverride = null) => {
    const query = textOverride || input;
    if (!query.trim()) return;

    setShowFAQs(false);
    setMessages(prev => [...prev, { sender: 'user', text: query }]);
    setInput("");
    setLoading(true);

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

    try {
      const res = await axios.get(`http://localhost:5000/api/assistant`, {
        params: { query, context }
      });
      const botReply = res.data.reply;
      setTimeout(() => {
        setMessages(prev => [...prev, { sender: 'bot', text: botReply }]);
        playBlip();
        setLoading(false);
      }, 600);
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', text: "I'm having trouble reaching the server right now." }]);
      setLoading(false);
    }
  };

  const toggleListening = () => {
    if (!isSpeechSupported) return; // Prevent action if not supported
    if (isListening) {
        recognitionRef.current.stop();
    } else {
        recognitionRef.current.start();
    }
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
                {/* Fallback Warning for Firefox Users */}
                {!isSpeechSupported && (
                    <div className="flex justify-center mb-2">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2 border border-yellow-200 dark:border-yellow-800">
                            <AlertCircle size={14} />
                            <span>Voice chat works best in Chrome/Edge.</span>
                        </div>
                    </div>
                )}

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

                {isListening && (
                    <div className="flex justify-end animate-fadeIn">
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-2xl rounded-br-none border border-red-200 dark:border-red-900 flex items-center gap-2">
                             <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                             </span>
                             <span className="text-xs font-bold text-red-600 dark:text-red-400">Listening...</span>
                        </div>
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
                
                {/* MICROPHONE BUTTON - CONDITIONALLY RENDERED */}
                {isSpeechSupported ? (
                    <button 
                        onClick={toggleListening}
                        className={`p-3 rounded-xl transition-all ${
                            isListening 
                            ? 'bg-red-100 text-red-600 animate-pulse border border-red-200' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        title="Speak"
                    >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                ) : (
                    <div 
                        className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                        title="Voice unavailable in this browser"
                    >
                        <MicOff size={20} />
                    </div>
                )}
                
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={isListening ? "Listening..." : "Ask a question..."}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all"
                    disabled={isListening} 
                />
                
                <button 
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isListening}
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