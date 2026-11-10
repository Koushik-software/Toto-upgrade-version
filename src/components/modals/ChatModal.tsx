import React, { useState, useEffect, useRef } from 'react';
import { ChatMsg } from '../../types';
import { appDb } from '../../lib/supabase';
import { 
  Send, 
  X, 
  MessageSquare, 
  Check, 
  CheckCheck, 
  Phone,
  Sparkles
} from 'lucide-react';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string;
  senderRole: 'user' | 'driver';
  currentUserId: string;
  currentUserName: string;
  partnerName: string;
  partnerPhone?: string;
}

const QUICK_REPLIES_USER = [
  'I am at the pickup point',
  'Please call me',
  'Where are you right now?',
  'I am wearing a black shirt',
  'Coming down in 1 minute'
];

const QUICK_REPLIES_DRIVER = [
  'I have reached the pickup location',
  'Stuck in light traffic, arriving in 2 mins',
  'Please come to the main road stand',
  'I am waiting outside the gate',
  'Please share your exact landmark'
];

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  rideId,
  senderRole,
  currentUserId,
  currentUserName,
  partnerName,
  partnerPhone
}) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const quickReplies = senderRole === 'user' ? QUICK_REPLIES_USER : QUICK_REPLIES_DRIVER;

  // Real-time chat sync with Supabase-ready data store
  useEffect(() => {
    if (!isOpen || !rideId) return;

    const unsubscribe = appDb.subscribe<ChatMsg>('chat_messages', (allMsgs) => {
      const filtered = allMsgs.filter((m) => m.rideId === rideId);
      filtered.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
      setMessages(filtered);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [isOpen, rideId]);

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInputText('');

    const newMsg: ChatMsg = {
      id: `msg_${Date.now()}`,
      rideId,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole,
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    // Optimistically update local view
    setMessages((prev) => [...prev, newMsg]);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      appDb.set('chat_messages', newMsg.id, newMsg);
    } catch (err) {
      console.debug('Chat message save deferred:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-neutral-200 flex flex-col h-[560px] max-h-[90vh]">
        {/* Chat Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FFF3C4] text-[#8C5200] flex items-center justify-center font-bold text-sm">
              {partnerName.charAt(0)}
            </div>
            <div>
              <div className="font-extrabold text-sm text-neutral-900">{partnerName}</div>
              <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live In-App Chat • Ride #{rideId.slice(-4)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {partnerPhone && (
              <a
                href={`tel:${partnerPhone}`}
                className="p-2 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-colors"
                title="Call Partner"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Bubble Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF8F5]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400 space-y-2">
              <MessageSquare className="w-8 h-8 text-neutral-300" />
              <p className="text-xs font-semibold">No messages yet.</p>
              <p className="text-[11px]">Send a quick update or message to your {senderRole === 'user' ? 'captain' : 'passenger'}.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderRole === senderRole;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-xs ${
                      isMe
                        ? 'bg-[#E07A00] text-white rounded-br-xs'
                        : 'bg-white text-neutral-900 border border-neutral-200 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    <p className="leading-relaxed font-medium">{msg.text}</p>
                    <div
                      className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${
                        isMe ? 'text-white/80' : 'text-neutral-400'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {isMe && <CheckCheck className="w-3 h-3" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {/* Quick Reply Chips */}
        <div className="px-3 py-2 bg-white border-t border-neutral-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {quickReplies.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(reply)}
              className="px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-[#FFF3C4] hover:text-[#8C5200] text-neutral-600 text-[10px] font-semibold shrink-0 transition-colors cursor-pointer"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText);
          }}
          className="p-3 bg-white border-t border-neutral-200 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-neutral-100 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#E07A00]"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="p-2.5 rounded-2xl bg-[#E07A00] hover:bg-[#C96E00] text-white transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
