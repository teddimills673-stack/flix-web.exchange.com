'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/lib/store';
import { 
  Headphones, Send, Bot, User, AlertCircle, RefreshCw, 
  ThumbsUp, ThumbsDown, ExternalLink, Image as ImageIcon, X, Paperclip, MessageSquare, ShieldCheck
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  feedback?: 'helpful' | 'unhelpful';
  image?: string;
}

export const SupportView: React.FC = () => {
  const { user, language, t } = useApp();
  const userId = user?.id || 'default_user';

  const [activeTabMode, setActiveTabMode] = useState<'ai' | 'live'>('ai');

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const sessionKey = `okxflix_support_session_${userId}`;
      const timestampKey = `okxflix_support_timestamp_${userId}`;
      const savedSession = localStorage.getItem(sessionKey);
      const savedTimestamp = localStorage.getItem(timestampKey);
      
      if (savedSession && savedTimestamp) {
        const lastActivity = parseInt(savedTimestamp, 10);
        const fifteenMinutes = 15 * 60 * 1000;
        
        if (Date.now() - lastActivity < fifteenMinutes) {
          return JSON.parse(savedSession);
        } else {
          const historyKey = `okxflix_support_history_${userId}`;
          const currentHistory = localStorage.getItem(historyKey);
          const parsedSession = JSON.parse(savedSession);
          const updatedHistory = currentHistory ? [...JSON.parse(currentHistory), ...parsedSession] : parsedSession;
          localStorage.setItem(historyKey, JSON.stringify(updatedHistory));

          localStorage.removeItem(sessionKey);
          localStorage.removeItem(timestampKey);
        }
      }
    } catch (e) {
      console.error('Failed to load support session', e);
    }
    return [];
  });
  
  const [inputMessage, setInputMessage] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveChatFailed, setLiveChatFailed] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isNearBottom, setIsNearBottom] = useState<boolean>(true);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setIsNearBottom(distanceToBottom < 100);
  };

  useEffect(() => {
    if (isNearBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isNearBottom]);

  // 15-minute inactivity timer check
  useEffect(() => {
    const sessionKey = `okxflix_support_session_${userId}`;
    const timestampKey = `okxflix_support_timestamp_${userId}`;

    try {
      if (messages.length > 0) {
        localStorage.setItem(sessionKey, JSON.stringify(messages));
        localStorage.setItem(timestampKey, Date.now().toString());
      } else {
        localStorage.removeItem(sessionKey);
        localStorage.removeItem(timestampKey);
      }
    } catch (e) {
      console.error('Failed to save support session', e);
    }
  }, [messages, userId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const timestampKey = `okxflix_support_timestamp_${userId}`;
      const savedTimestamp = localStorage.getItem(timestampKey);
      if (savedTimestamp) {
        const lastActivity = parseInt(savedTimestamp, 10);
        const fifteenMinutes = 15 * 60 * 1000;
        if (Date.now() - lastActivity >= fifteenMinutes) {
          setMessages([]);
          localStorage.removeItem(`okxflix_support_session_${userId}`);
          localStorage.removeItem(timestampKey);
        }
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image size must be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const sendMessageToApi = async (textToSend: string) => {
    if ((!textToSend.trim() && !selectedImage) || isLoading) return;

    // Check locally if user requests a human agent for instant transition
    const lowerText = textToSend.toLowerCase();
    const humanKeywords = ['human', 'agent', 'representative', 'real person', 'talk to someone', 'speak to a human', 'support team', 'person', 'operator', 'manager', 'customer service', 'actual person', 'somebody', 'someone', 'assistant', 'connect', 'transfer', 'real agent', 'live support', 'speak with somebody', 'talk to a real person', 'talk to an agent', 'connect me to an agent', 'i need a human', 'i want live support'];
    const isLocalHumanRequest = humanKeywords.some(kw => lowerText.includes(kw));

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const imagePayload = selectedImage;
    
    const newMessages: ChatMessage[] = [
      ...messages, 
      { sender: 'user', text: textToSend || '[Attached Screenshot]', timestamp: timeNow, image: imagePayload || undefined }
    ];
    
    setMessages(newMessages);
    setInputMessage('');
    setSelectedImage(null);
    setIsLoading(true);
    setErrorMessage(null);

    // If local human request, immediately open live chat without waiting or requiring extra clicks
    if (isLocalHumanRequest) {
      setIsLoading(false);
      setActiveTabMode('live');
      setLiveChatFailed(false);
      return;
    }

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, user, language, imageAttachment: imagePayload })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.reply || 'Support connection error');
      }

      setMessages(prev => [
        ...prev, 
        {
          sender: 'ai',
          text: data.reply || "I understand your inquiry. How else can I assist with your account?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      if (data.isHumanHandoff) {
        // Immediately open live tawk.to chat without any intermediate button or confirmation
        setActiveTabMode('live');
        setLiveChatFailed(false);
      }
    } catch (err) {
      setErrorMessage("Network anomaly detected. Automatically retrying...");
      try {
        const retryRes = await fetch('/api/support', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages, user, language, imageAttachment: imagePayload })
        });
        const retryData = await retryRes.json();
        setMessages(prev => [
          ...prev, 
          {
            sender: 'ai',
            text: retryData.reply || "I am connected and ready to assist you.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        if (retryData.isHumanHandoff) {
          setActiveTabMode('live');
        }
        setErrorMessage(null);
      } catch (retryErr) {
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: "Please tell me what specific problem you need help with.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setErrorMessage(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessageToApi(inputMessage);
  };

  const handleClearChat = () => {
    setMessages([]);
    setSelectedImage(null);
    setErrorMessage(null);
    setLiveChatFailed(false);
    localStorage.removeItem(`okxflix_support_session_${userId}`);
    localStorage.removeItem(`okxflix_support_timestamp_${userId}`);
  };

  const handleFeedback = (index: number, type: 'helpful' | 'unhelpful') => {
    setMessages(prev => prev.map((m, idx) => idx === index ? { ...m, feedback: type } : m));
  };

  const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
  const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID || 'default';
  const hasTawkProperty = Boolean(propertyId);

  const handleRetryLiveChat = () => {
    setLiveChatFailed(false);
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-12 animate-fadeIn max-w-4xl mx-auto">
      {/* Clean Minimal Support Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white">OKX FLIX Support Center</h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/10 text-emerald-400">
                Online 24/7
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure Institutional Support Channel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTabMode === 'live' && (
            <button
              onClick={() => setActiveTabMode('ai')}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Return to AI Support</span>
            </button>
          )}
          {messages.length > 0 && activeTabMode === 'ai' && (
            <button 
              onClick={handleClearChat}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('clearChat')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Support Mode (Tawk.to in-app chat) */}
      {activeTabMode === 'live' ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px]">
          <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-white">
                {hasTawkProperty ? "A support agent is available." : "Our support team is currently unavailable. Please leave a message and our team will respond as soon as possible."}
              </span>
            </div>
            <button
              onClick={() => setActiveTabMode('ai')}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Back to AI Chat
            </button>
          </div>

          <div className="flex-1 relative bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden">
            {liveChatFailed || !hasTawkProperty ? (
              <div className="text-center space-y-4 max-w-md p-6 bg-slate-900/90 border border-amber-500/30 rounded-2xl shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Live support is temporarily unavailable. Please try again shortly.</h3>
                <p className="text-xs text-slate-400">
                  Our live agents are currently offline or configuration is pending. You can retry connecting or continue with AI Support.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleRetryLiveChat}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-md"
                  >
                    Retry Connection
                  </button>
                  <button
                    onClick={() => setActiveTabMode('ai')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Continue with AI Support
                  </button>
                </div>
              </div>
            ) : (
              <iframe
                src={`https://embed.tawk.to/${propertyId}/${widgetId}`}
                title="OKX FLIX Live Support"
                className="w-full h-full border-0 rounded-b-2xl bg-slate-950"
                onError={() => setLiveChatFailed(true)}
                allow="microphone; camera; display-capture"
              />
            )}
          </div>
        </div>
      ) : (
        /* AI Support Chat Container */
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[580px]">
          {/* Header Info */}
          <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Encrypted Session • User ID: {userId.substring(0, 10)}...</span>
            </div>
            <button
              onClick={() => setActiveTabMode('live')}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center gap-1"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Connect Live Agent</span>
            </button>
          </div>

          {/* Messages List */}
          <div 
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-blue-600/10 text-blue-400 flex items-center justify-center">
                  <Bot className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-white">How can we assist your account today?</h3>
                <p className="text-xs max-w-sm text-slate-400 leading-relaxed">
                  Type your question below regarding withdrawals, deposits, account status, trading, or security. Say "talk to a real person" anytime to connect with live support.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex gap-3 max-w-[90%] sm:max-w-[80%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-blue-400 border border-slate-700'}`}>
                    {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className={`p-3.5 rounded-2xl text-sm leading-relaxed overflow-hidden break-words ${
                      msg.sender === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none'
                    }`}>
                      {msg.image && (
                        <div className="mb-2.5 rounded-xl overflow-hidden border border-white/20 max-w-xs">
                          <img src={msg.image} alt="Attached screenshot" className="w-full h-auto object-cover max-h-48" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      {msg.sender === 'ai' ? (
                        <div className="markdown-body space-y-2">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.text}</p>
                      )}
                    </div>
                    <div className={`flex items-center gap-2 text-[10px] text-slate-500 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <span>{msg.timestamp}</span>
                      {msg.sender === 'ai' && (
                        <div className="flex items-center gap-1 ml-2">
                          <button 
                            onClick={() => handleFeedback(idx, 'helpful')} 
                            className={`p-1 hover:text-emerald-400 transition-colors ${msg.feedback === 'helpful' ? 'text-emerald-400 font-bold' : ''}`}
                            title="Helpful"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => handleFeedback(idx, 'unhelpful')} 
                            className={`p-1 hover:text-rose-400 transition-colors ${msg.feedback === 'unhelpful' ? 'text-rose-400 font-bold' : ''}`}
                            title="Unhelpful"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-3 mr-auto items-center text-slate-400">
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-blue-400 flex items-center justify-center border border-slate-700">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="ml-1 text-slate-300 font-medium">Processing institutional request...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Selected Image Thumbnail Preview */}
          {selectedImage && (
            <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-700 relative">
                  <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <span className="text-xs text-slate-300 font-medium">Screenshot attached for AI analysis</span>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input Form & Attachment */}
          <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2 sm:gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              accept="image/png,image/jpeg,image/webp" 
              className="hidden" 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl transition-colors shrink-0"
              title="Upload Screenshot / Image"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input 
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your question or say 'talk to a real person'..."
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors min-w-0"
            />
            <button
              type="submit"
              disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
              className="px-4 sm:px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/25 shrink-0"
            >
              <span className="hidden sm:inline">{t('send')}</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
