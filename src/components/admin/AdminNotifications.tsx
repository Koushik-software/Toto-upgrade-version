import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { 
  Bell, 
  Send, 
  Users, 
  Car, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  MessageSquare
} from 'lucide-react';

interface NotificationBroadcast {
  id: string;
  title: string;
  message: string;
  target: 'all' | 'drivers' | 'customers';
  zone: string;
  sentAt: string;
  deliveryCount: number;
}

const PRESET_TEMPLATES = [
  {
    title: '🌧️ Monsoon Alert: High Toto Demand in Sector V',
    message: 'Rain expected in Salt Lake Sector V. All Toto captains are advised to go online to capture 1.2x surge incentives.',
    target: 'drivers' as const,
    zone: 'Salt Lake Sector V'
  },
  {
    title: '🎉 Flat ₹20 OFF on your next E-Rickshaw ride!',
    message: 'Use code RAPIDOTOTO on your next trip. Valid on all Toto electric hops today.',
    target: 'customers' as const,
    zone: 'All Kolkata Zones'
  },
  {
    title: '⚡ New Eco Charging Station live at Karunamoyee',
    message: 'Fast Li-ion battery swap station is now operational near Central Park Gate 3 for all registered Toto Partners.',
    target: 'drivers' as const,
    zone: 'Bidhannagar'
  }
];

export const AdminNotifications: React.FC = () => {
  const { triggerSound } = useRide();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'drivers' | 'customers'>('all');
  const [targetZone, setTargetZone] = useState('All Kolkata Zones');
  const [isSending, setIsSending] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const [history, setHistory] = useState<NotificationBroadcast[]>(() => {
    try {
      const stored = localStorage.getItem('toto_broadcast_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleApplyTemplate = (tmpl: typeof PRESET_TEMPLATES[0]) => {
    triggerSound('beep');
    setTitle(tmpl.title);
    setMessage(tmpl.message);
    setTargetAudience(tmpl.target);
    setTargetZone(tmpl.zone);
  };

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSending(true);
    triggerSound('beep');

    setTimeout(() => {
      const newBroadcast: NotificationBroadcast = {
        id: `notif_${Date.now()}`,
        title,
        message,
        target: targetAudience,
        zone: targetZone,
        sentAt: 'Just now',
        deliveryCount: 1
      };

      setHistory((prev) => {
        const next = [newBroadcast, ...prev];
        try {
          localStorage.setItem('toto_broadcast_history', JSON.stringify(next.slice(0, 50)));
        } catch {}
        return next;
      });
      setIsSending(false);
      setTitle('');
      setMessage('');
      setSuccessNotice(`Broadcast dispatched successfully!`);
      triggerSound('success');
    }, 400);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Compose Notification Card */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#C8622A]" />
            <h3 className="font-extrabold text-sm text-[#111111]">
              Push & In-App Broadcast Center
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            FCM Channel Ready
          </span>
        </div>

        {successNotice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-2.5 rounded-xl flex items-center justify-between">
            <span>{successNotice}</span>
            <button onClick={() => setSuccessNotice(null)} className="text-emerald-700 font-bold">✕</button>
          </div>
        )}

        {/* Preset Templates */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Quick Preset Broadcasts
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyTemplate(tmpl)}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-xs text-neutral-700 font-medium transition-all cursor-pointer text-left truncate max-w-xs"
              >
                {tmpl.title}
              </button>
            ))}
          </div>
        </div>

        {/* Compose Form */}
        <form onSubmit={handleSendNotification} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-neutral-700 block mb-1">Target Audience</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-[#FAF8F5] border border-neutral-200 text-xs font-semibold"
              >
                <option value="all">Everyone (Passengers + Captains)</option>
                <option value="drivers">Toto Captains Only</option>
                <option value="customers">Passengers Only</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-neutral-700 block mb-1">Target Geographic Zone</label>
              <select
                value={targetZone}
                onChange={(e) => setTargetZone(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#FAF8F5] border border-neutral-200 text-xs font-semibold"
              >
                <option value="All Kolkata Zones">All Kolkata Zones</option>
                <option value="Salt Lake Sector V">Salt Lake Sector V (IT Zone)</option>
                <option value="New Town Action Area 1 & 2">New Town Action Area 1 & 2</option>
                <option value="Karunamoyee & Central Park">Karunamoyee & Central Park</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-neutral-700 block mb-1">Broadcast Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 🌧️ High Demand in Salt Lake Sector V"
              className="w-full p-2.5 rounded-xl bg-[#FAF8F5] border border-neutral-200 text-xs font-medium focus:outline-none focus:border-[#C8622A]"
              required
            />
          </div>

          <div>
            <label className="font-bold text-neutral-700 block mb-1">Message Body</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Enter push notification content and instructions..."
              className="w-full p-2.5 rounded-xl bg-[#FAF8F5] border border-neutral-200 text-xs font-medium focus:outline-none focus:border-[#C8622A]"
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2.5 rounded-xl bg-[#C8622A] hover:bg-[#a64e1e] active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Sending Broadcast...' : 'Transmit Notification'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Broadcast History */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-2xs space-y-3">
        <h4 className="font-extrabold text-sm text-[#111111] flex items-center gap-2">
          <Clock className="w-4 h-4 text-neutral-400" />
          <span>Broadcast Transmission Log</span>
        </h4>

        <div className="space-y-2">
          {history.map((item) => (
            <div key={item.id} className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-bold text-neutral-900">{item.title}</div>
                <span className="text-[10px] text-neutral-400 font-medium">{item.sentAt}</span>
              </div>
              <p className="text-neutral-600 text-[11px]">{item.message}</p>
              <div className="flex items-center gap-2 pt-1 text-[10px] text-neutral-500 font-semibold">
                <span className="capitalize px-1.5 py-0.5 rounded bg-white border border-neutral-200">
                  Target: {item.target}
                </span>
                <span>•</span>
                <span>Zone: {item.zone}</span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">
                  Delivered to {item.deliveryCount} devices
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
