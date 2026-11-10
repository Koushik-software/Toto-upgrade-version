import React, { useState } from 'react';
import { ActiveRide, TripRecord } from '../../types';
import { 
  History, 
  X, 
  MapPin, 
  IndianRupee, 
  FileText, 
  RotateCw, 
  AlertCircle, 
  Star, 
  Calendar,
  ArrowRight
} from 'lucide-react';

interface RideHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRide: ActiveRide | null;
  completedTrips: TripRecord[];
  onBookAgain: (pickup: string, dropoff: string) => void;
  onOpenReceipt: (trip: TripRecord) => void;
  onReportIssue: (tripId: string) => void;
}

export const RideHistoryModal: React.FC<RideHistoryModalProps> = ({
  isOpen,
  onClose,
  activeRide,
  completedTrips,
  onBookAgain,
  onOpenReceipt,
  onReportIssue
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'cancelled'>('all');

  if (!isOpen) return null;

  const filteredTrips = completedTrips.filter((t) => {
    if (activeTab === 'completed') return t.status === 'completed';
    if (activeTab === 'cancelled') return t.status === 'cancelled';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden border border-neutral-200 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#FFF3C4] text-[#8C5200]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-neutral-900">My Rides</h3>
              <p className="text-[11px] text-neutral-500 font-medium">Trip ledger & past journeys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="px-4 py-2.5 border-b border-neutral-100 flex gap-2">
          {(['all', 'completed', 'cancelled'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs capitalize transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#E07A00] text-white'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Rides List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Ongoing active ride if present */}
          {activeRide && activeRide.status !== 'completed' && activeRide.status !== 'cancelled' && (
            <div className="p-3.5 bg-[#FFF9E6] border border-[#FFE082] rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-[#8C5200] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Trip in Progress
                </span>
                <span className="font-mono text-xs font-bold text-neutral-900">₹{activeRide.fare}</span>
              </div>
              <div className="text-xs space-y-1">
                <p className="font-semibold text-neutral-800">{activeRide.pickup.name} &rarr; {activeRide.dropoff.name}</p>
                <p className="text-[11px] text-neutral-500">Captain: {activeRide.driverName} ({activeRide.driverVehicleNumber})</p>
              </div>
            </div>
          )}

          {filteredTrips.length > 0 ? (
            filteredTrips.map((trip) => (
              <div
                key={trip.id}
                className="p-3.5 bg-neutral-50 hover:bg-white rounded-2xl border border-neutral-200 space-y-2.5 transition-colors"
              >
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-neutral-500">
                      #{trip.id.slice(-6)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      trip.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {trip.status}
                    </span>
                  </div>
                  <span className="font-black font-mono text-sm text-neutral-900">
                    ₹{trip.fare}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-neutral-800 font-semibold">
                    <span className="truncate">{trip.pickupAddress}</span>
                    <span>&rarr;</span>
                    <span className="truncate">{trip.dropoffAddress}</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 flex items-center gap-3">
                    <span>{trip.passengerName}</span>
                    <span>•</span>
                    <span>{trip.distanceKm?.toFixed(1) || '3.2'} km</span>
                    <span>•</span>
                    <span>{trip.completedAt || 'Recently'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-xs">
                  <button
                    onClick={() => onBookAgain(trip.pickupAddress, trip.dropoffAddress)}
                    className="text-[#E07A00] font-bold hover:underline flex items-center gap-1"
                  >
                    <span>Book Again</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onReportIssue(trip.id)}
                      className="text-neutral-500 hover:text-neutral-800 font-semibold text-[11px]"
                    >
                      Report Issue
                    </button>
                    <button
                      onClick={() => onOpenReceipt(trip)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-neutral-800 font-bold text-[11px] hover:bg-neutral-50 transition-colors flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3 text-[#E07A00]" />
                      <span>Receipt</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-neutral-400 space-y-1">
              <p className="font-bold">No trips found in this category.</p>
              <p>Completed electric rickshaw journeys will appear here automatically.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
