import React from 'react';
import { IndianRupee, X, Info, Tag, Zap, ShieldCheck } from 'lucide-react';

interface FareBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseFare: number;
  distanceCharge: number;
  timeCharge: number;
  waitingCharge?: number;
  surgeCharge?: number;
  couponDiscount?: number;
  totalFare: number;
  distanceKm: number;
  durationMins: number;
  vehicleName: string;
  appliedCouponCode?: string;
}

export const FareBreakdownModal: React.FC<FareBreakdownModalProps> = ({
  isOpen,
  onClose,
  baseFare,
  distanceCharge,
  timeCharge,
  waitingCharge = 0,
  surgeCharge = 0,
  couponDiscount = 0,
  totalFare,
  distanceKm,
  durationMins,
  vehicleName,
  appliedCouponCode
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#FFF3C4] text-[#8C5200]">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-neutral-900">Fare Breakdown</h3>
              <p className="text-[11px] text-neutral-500 font-medium">{vehicleName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Breakdown Items */}
        <div className="p-4 space-y-3 text-xs">
          <div className="flex justify-between items-center text-neutral-600">
            <span>Base Fare (First 1.5 km)</span>
            <span className="font-semibold font-mono text-neutral-900">₹{baseFare.toFixed(0)}</span>
          </div>

          <div className="flex justify-between items-center text-neutral-600">
            <span>Distance Charge ({distanceKm.toFixed(1)} km)</span>
            <span className="font-semibold font-mono text-neutral-900">₹{distanceCharge.toFixed(0)}</span>
          </div>

          <div className="flex justify-between items-center text-neutral-600">
            <span>Time & Motion Charge (~{durationMins} mins)</span>
            <span className="font-semibold font-mono text-neutral-900">₹{timeCharge.toFixed(0)}</span>
          </div>

          {waitingCharge > 0 && (
            <div className="flex justify-between items-center text-neutral-600">
              <span>Pickup Waiting Tolerance</span>
              <span className="font-semibold font-mono text-neutral-900">₹{waitingCharge.toFixed(0)}</span>
            </div>
          )}

          {surgeCharge > 0 && (
            <div className="flex justify-between items-center text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">
              <span className="flex items-center gap-1.5 font-bold">
                <Zap className="w-3.5 h-3.5" /> Peak Hour Adjustment
              </span>
              <span className="font-bold font-mono">+₹{surgeCharge.toFixed(0)}</span>
            </div>
          )}

          {couponDiscount > 0 && (
            <div className="flex justify-between items-center text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
              <span className="flex items-center gap-1.5 font-bold">
                <Tag className="w-3.5 h-3.5" /> Coupon Discount ({appliedCouponCode})
              </span>
              <span className="font-bold font-mono">-₹{couponDiscount.toFixed(0)}</span>
            </div>
          )}

          {/* Subtotal / Final */}
          <div className="pt-3 border-t border-neutral-100 flex justify-between items-center text-base">
            <span className="font-black text-neutral-900">Total Payable Fare</span>
            <span className="font-black text-[#E07A00] font-mono text-lg">₹{totalFare}</span>
          </div>
        </div>

        {/* Guarantee Banner */}
        <div className="p-3 bg-[#FAF8F5] border-t border-neutral-100 flex items-center gap-2 text-[11px] text-neutral-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>No surge surprises. All fares are capped by E-Rickshaw WB transport norms.</span>
        </div>
      </div>
    </div>
  );
};
