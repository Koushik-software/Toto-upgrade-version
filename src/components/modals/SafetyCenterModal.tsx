import React from 'react';
import { 
  ShieldCheck, 
  X, 
  PhoneCall, 
  Share2, 
  UserCheck, 
  Lock, 
  AlertTriangle,
  BadgeCheck
} from 'lucide-react';

interface SafetyCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSos: () => void;
}

export const SafetyCenterModal: React.FC<SafetyCenterModalProps> = ({
  isOpen,
  onClose,
  onOpenSos
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-neutral-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-neutral-900">Safety Center</h3>
              <p className="text-[11px] text-neutral-500 font-medium">Your protection on every journey</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Emergency SOS Shortcut */}
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-600 text-white">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-red-900">Emergency Assistance</div>
                <div className="text-[10px] text-red-700">Immediate 112 & Support access</div>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenSos();
              }}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Open SOS
            </button>
          </div>

          {/* Safety Pillars */}
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-800 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-neutral-900">100% Verified Captains</h4>
                <p className="text-neutral-500 text-[11px] pt-0.5">
                  Every Toto Drive partner undergoes Aadhaar identity checks, Commercial e-rickshaw RC validation, and strict physical vehicle safety verification by our Admin team.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="p-2 rounded-xl bg-[#FFF3C4] text-[#8C5200] shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-neutral-900">Start Ride 4-Digit PIN</h4>
                <p className="text-neutral-500 text-[11px] pt-0.5">
                  Your ride will never begin until you share your secret 4-digit OTP directly with your assigned captain, eliminating ride mix-ups.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-800 shrink-0">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-neutral-900">Live GPS Trip Sharing</h4>
                <p className="text-neutral-500 text-[11px] pt-0.5">
                  Share live tracking links directly with family or friends so they can view your exact position on the map in real time.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                <BadgeCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-neutral-900">Regulated Green Mobility</h4>
                <p className="text-neutral-500 text-[11px] pt-0.5">
                  Operates within designated transport routes with zero emissions, safe speeds, and full fare transparency.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
