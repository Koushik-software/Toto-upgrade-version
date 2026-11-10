import React, { useState } from 'react';
import { CouponItem } from '../../types';
import { Tag, Check, X, AlertCircle, Sparkles, Percent } from 'lucide-react';

interface CouponsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFare: number;
  appliedCoupon: CouponItem | null;
  onApplyCoupon: (coupon: CouponItem) => void;
  onRemoveCoupon: () => void;
}

export const DEFAULT_COUPONS: CouponItem[] = [
  {
    code: 'WELCOME50',
    title: 'First Electric Ride Special',
    discountPct: 50,
    maxDiscount: 25,
    minFare: 20,
    desc: 'Get 50% off up to ₹25 on your initial Toto Drive booking.',
    isActive: true,
    expiresAt: '2026-12-31'
  },
  {
    code: 'GREENRIDE',
    title: 'Eco-Hero Commute Reward',
    discountPct: 20,
    maxDiscount: 15,
    minFare: 25,
    desc: 'Flat 20% discount on every zero-emission e-rickshaw ride.',
    isActive: true,
    expiresAt: '2026-12-31'
  },
  {
    code: 'RAPIDOTOTO',
    title: 'Metro Connector Pass',
    discountPct: 30,
    maxDiscount: 20,
    minFare: 30,
    desc: 'Save 30% on rides starting or ending at Kolkata metro stations.',
    isActive: true,
    expiresAt: '2026-12-31'
  },
  {
    code: 'TOTO50',
    title: 'Sector V Tech Worker Off',
    discountPct: 15,
    maxDiscount: 10,
    minFare: 15,
    desc: 'Daily office commute savings across Salt Lake and New Town.',
    isActive: true,
    expiresAt: '2026-12-31'
  }
];

export const CouponsModal: React.FC<CouponsModalProps> = ({
  isOpen,
  onClose,
  currentFare,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon
}) => {
  const [customCode, setCustomCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleCustomApply = () => {
    setErrorMsg('');
    const found = DEFAULT_COUPONS.find(
      (c) => c.code.toUpperCase() === customCode.trim().toUpperCase()
    );
    if (!found) {
      setErrorMsg('Invalid promo code. Please select from the list below.');
      return;
    }
    if (currentFare < found.minFare) {
      setErrorMsg(`Minimum trip fare of ₹${found.minFare} required for this coupon.`);
      return;
    }
    onApplyCoupon(found);
    onClose();
  };

  const handleSelectCoupon = (coupon: CouponItem) => {
    if (currentFare < coupon.minFare) {
      setErrorMsg(`Trip fare (₹${currentFare}) is below ₹${coupon.minFare} minimum fare requirement.`);
      return;
    }
    onApplyCoupon(coupon);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-neutral-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-neutral-900">Apply Coupon</h3>
              <p className="text-[11px] text-neutral-500 font-medium">Save on your e-rickshaw ride</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input for Promo code */}
        <div className="p-4 border-b border-neutral-100 bg-neutral-50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customCode}
              onChange={(e) => {
                setCustomCode(e.target.value.toUpperCase());
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Enter coupon code"
              className="flex-1 bg-white border border-neutral-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#E07A00] uppercase tracking-wider"
            />
            <button
              onClick={handleCustomApply}
              disabled={!customCode.trim()}
              className="bg-[#E07A00] hover:bg-[#C96E00] text-white font-bold text-xs px-4 py-2.5 rounded-2xl transition-colors disabled:opacity-50"
            >
              Apply
            </button>
          </div>

          {errorMsg && (
            <div className="mt-2 text-[11px] text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Available Coupons List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {appliedCoupon && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="font-bold text-xs text-emerald-900">
                    {appliedCoupon.code} Applied
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    Saving {appliedCoupon.discountPct}% off (Max ₹{appliedCoupon.maxDiscount})
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  onRemoveCoupon();
                  onClose();
                }}
                className="text-xs font-bold text-red-600 hover:text-red-700 underline"
              >
                Remove
              </button>
            </div>
          )}

          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
            Available Promos
          </div>

          {DEFAULT_COUPONS.map((coupon) => {
            const isApplied = appliedCoupon?.code === coupon.code;
            const isEligible = currentFare >= coupon.minFare;

            return (
              <div
                key={coupon.code}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isApplied
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : isEligible
                    ? 'border-neutral-200 bg-white hover:border-[#E07A00]'
                    : 'border-neutral-100 bg-neutral-50/70 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs px-2 py-0.5 rounded-lg bg-[#FFF3C4] text-[#8C5200] border border-[#FFE082] tracking-wider font-mono">
                        {coupon.code}
                      </span>
                      <span className="font-extrabold text-xs text-neutral-900">
                        {coupon.discountPct}% OFF
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-neutral-800">{coupon.title}</p>
                    <p className="text-[11px] text-neutral-500">{coupon.desc}</p>
                    <div className="text-[10px] text-neutral-400 pt-0.5">
                      Min. fare: ₹{coupon.minFare} • Max discount: ₹{coupon.maxDiscount}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectCoupon(coupon)}
                    disabled={isApplied || !isEligible}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-colors ${
                      isApplied
                        ? 'bg-emerald-600 text-white cursor-default'
                        : isEligible
                        ? 'bg-[#E07A00] hover:bg-[#C96E00] text-white cursor-pointer'
                        : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    }`}
                  >
                    {isApplied ? 'Applied' : 'Apply'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
