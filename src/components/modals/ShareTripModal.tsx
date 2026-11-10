import React, { useState } from 'react';
import { ActiveRide } from '../../types';
import { 
  Share2, 
  Copy, 
  Check, 
  X, 
  MapPin, 
  Navigation, 
  Car, 
  Clock, 
  ShieldCheck 
} from 'lucide-react';

interface ShareTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  ride: ActiveRide;
}

export const ShareTripModal: React.FC<ShareTripModalProps> = ({
  isOpen,
  onClose,
  ride
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const trackingUrl = `https://totodrive.in/track?ride=${ride.id}`;
  const shareText = `🚖 Track my Toto Drive e-rickshaw ride!\n• Status: ${ride.status.replace('_', ' ').toUpperCase()}\n• Driver: ${ride.driverName} (${ride.driverVehicleNumber || 'WB-Toto'})\n• Pickup: ${ride.pickup.name}\n• Destination: ${ride.dropoff.name}\n• Est. ETA: ${ride.estimatedDurationMins || 10} mins\n• Live Link: ${trackingUrl}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Toto Drive Ride #${ride.id.slice(-6)}`,
        text: shareText
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-neutral-900">Share Trip Details</h3>
              <p className="text-[11px] text-neutral-500 font-medium">Keep friends & family updated</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Trip Summary Card */}
        <div className="p-4 space-y-3">
          <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-neutral-200 space-y-2 text-xs">
            <div className="flex justify-between items-center text-neutral-500 font-medium">
              <span>Ride #{ride.id.slice(-6)}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                {ride.status.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <span className="text-neutral-800 font-semibold truncate">{ride.pickup.name}</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-[#E07A00] mt-1 shrink-0" />
                <span className="text-neutral-800 font-semibold truncate">{ride.dropoff.name}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-200 flex justify-between text-neutral-600">
              <span>Captain: <strong>{ride.driverName}</strong></span>
              <span className="font-mono font-bold text-neutral-800">{ride.driverVehicleNumber}</span>
            </div>
          </div>

          {/* Tracking Link Box */}
          <div className="flex items-center gap-2 bg-neutral-100 p-2.5 rounded-2xl text-xs">
            <span className="flex-1 truncate font-mono text-neutral-600 text-[11px]">
              {trackingUrl}
            </span>
            <button
              onClick={handleCopyLink}
              className="px-2.5 py-1 rounded-xl bg-white border border-neutral-200 text-neutral-800 font-bold text-xs flex items-center gap-1 hover:bg-neutral-50 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Native Share Button */}
          <button
            onClick={handleShare}
            className="w-full bg-[#E07A00] hover:bg-[#C96E00] text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Share via WhatsApp or Apps</span>
          </button>
        </div>
      </div>
    </div>
  );
};
