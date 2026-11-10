import React, { useState } from 'react';
import { GeoPoint, ScheduledRide } from '../../types';
import { VEHICLE_OPTIONS } from '../../data/appData';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  X, 
  Check, 
  Car, 
  AlertCircle 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ScheduleRideModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPickup: GeoPoint;
  currentDropoff: GeoPoint | null;
  userId: string;
  userName: string;
  userPhone: string;
  onConfirmSchedule: (ride: ScheduledRide) => Promise<void>;
}

export const ScheduleRideModal: React.FC<ScheduleRideModalProps> = ({
  isOpen,
  onClose,
  currentPickup,
  currentDropoff,
  userId,
  userName,
  userPhone,
  onConfirmSchedule
}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('09:30');
  const [selectedVehicle, setSelectedVehicle] = useState('toto');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduledSuccess, setScheduledSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const vehicleObj = VEHICLE_OPTIONS.find((v) => v.id === selectedVehicle) || VEHICLE_OPTIONS[0];
    const schedItem: ScheduledRide = {
      id: `sched_${Date.now()}`,
      userId,
      userName,
      userPhone,
      pickup: currentPickup,
      dropoff: currentDropoff || currentPickup,
      scheduledDate: date,
      scheduledTime: time,
      vehicleType: selectedVehicle,
      estimatedFare: vehicleObj.baseFare + 15,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };

    try {
      await onConfirmSchedule(schedItem);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
      setScheduledSuccess(true);
      setTimeout(() => {
        setScheduledSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Schedule ride error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-neutral-900">Schedule Ahead</h3>
              <p className="text-[11px] text-neutral-500 font-medium">Reserve e-rickshaw for future date & time</p>
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
        {scheduledSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-base text-neutral-900">Ride Scheduled Successfully!</h4>
            <p className="text-xs text-neutral-500">
              We'll assign the nearest e-rickshaw captain 15 minutes before your scheduled pickup at {time} on {date}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            {/* Pickup & Destination info */}
            <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-neutral-200 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-neutral-800 font-semibold truncate">{currentPickup.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#E07A00] shrink-0" />
                <span className="text-neutral-800 font-semibold truncate">{currentDropoff?.name || 'Drop-off location'}</span>
              </div>
            </div>

            {/* Date & Time Picker */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold text-neutral-700">Date</label>
                <div className="flex items-center bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-2.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400 mr-2" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-transparent font-medium text-neutral-900 focus:outline-none text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-neutral-700">Time</label>
                <div className="flex items-center bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-2.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400 mr-2" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-transparent font-medium text-neutral-900 focus:outline-none text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Selection */}
            <div className="space-y-1.5">
              <label className="block font-bold text-neutral-700">Vehicle Category</label>
              <div className="grid grid-cols-2 gap-2">
                {VEHICLE_OPTIONS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVehicle(v.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedVehicle === v.id
                        ? 'border-[#E07A00] bg-[#FFF9E6]'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-neutral-900">{v.name}</div>
                    <div className="text-[10px] text-neutral-500">Est. ₹{v.baseFare + 15}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#E07A00] hover:bg-[#C96E00] text-white font-bold py-3 px-4 rounded-2xl text-xs transition-colors cursor-pointer disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'Reserving Ride...' : 'Confirm Scheduled Ride'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
