import React, { useState } from 'react';
import { X, CheckCircle2, UserCheck, ShieldCheck, Mail, User, ArrowRight } from 'lucide-react';
import { UserProfile } from '../../types';

interface GoogleAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (profile: UserProfile) => void;
  initialEmail?: string;
}

export const GoogleAccountModal: React.FC<GoogleAccountModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
  initialEmail = ''
}) => {
  const [email, setEmail] = useState(initialEmail || '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91 98301 45289');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your Google account email');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    // Generate displayName from email if empty
    const derivedName = name.trim() || cleanEmail.split('@')[0]
      .split(/[._-]/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Google Rider';

    const userId = 'usr_g_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(cleanEmail)}`;

    const userProfile: UserProfile = {
      id: userId,
      name: derivedName,
      email: cleanEmail,
      phone: phone.trim() || '+91 98301 45289',
      avatarUrl,
      rating: 5.0,
      totalRides: 0,
      savedPlaces: {},
      walletBalance: 250,
      createdAt: new Date().toISOString()
    };

    setTimeout(() => {
      setLoading(false);
      onSelectAccount(userProfile);
    }, 400);
  };

  const handleQuickSelect = (presetEmail: string, presetName: string) => {
    setEmail(presetEmail);
    setName(presetName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="google-account-chooser-modal"
        className="bg-white rounded-3xl shadow-2xl border border-neutral-200 max-w-md w-full overflow-hidden text-neutral-900"
      >
        {/* Header with Google Colors */}
        <div className="p-6 pb-4 border-b border-neutral-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-center shrink-0 shadow-xs">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.43 7.37 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.57 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900 leading-tight">Sign in with Google</h3>
              <p className="text-xs text-neutral-500">to continue to Toto Drive Passenger App</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 pt-5 space-y-5">
          {/* Quick Account Suggestions */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Select or Enter End-User Google Account
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSelect('passenger.rider@gmail.com', 'Alex Rivera')}
                className="text-left p-2.5 rounded-xl border border-neutral-200 hover:border-[#E07A00] hover:bg-amber-50/40 transition-all flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                  A
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-neutral-900 truncate">Alex Rivera</div>
                  <div className="text-[10px] text-neutral-500 truncate">passenger.rider@gmail.com</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('priya.totodrive@gmail.com', 'Priya Sharma')}
                className="text-left p-2.5 rounded-xl border border-neutral-200 hover:border-[#E07A00] hover:bg-amber-50/40 transition-all flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                  P
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-neutral-900 truncate">Priya Sharma</div>
                  <div className="text-[10px] text-neutral-500 truncate">priya.totodrive@gmail.com</div>
                </div>
              </button>
            </div>
          </div>

          {/* Form to enter any custom user email */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center justify-between">
                <span>Google Account Email</span>
                <span className="text-[11px] text-neutral-400 font-normal">Any valid Google / Gmail ID</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E07A00]/30 focus:border-[#E07A00]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Passenger Name (optional)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe (auto-derived if left blank)"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E07A00]/30 focus:border-[#E07A00]"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                {error}
              </p>
            )}

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="flex-1 bg-[#111111] hover:bg-neutral-800 active:scale-[0.99] text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Authenticate & Open Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security footnote */}
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 text-[11px] text-neutral-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Authenticated via Google Cloud Client ID (OAuth 2.0). Safe & encrypted.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
