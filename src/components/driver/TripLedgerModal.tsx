import React from 'react';
import { TripRecord } from '../../types';
import { X, IndianRupee, Clock, MapPin, CheckCircle, Navigation, Award } from 'lucide-react';

interface TripLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: TripRecord[];
  totalEarnings: number;
}

export const TripLedgerModal: React.FC<TripLedgerModalProps> = ({
  isOpen,
  onClose,
  trips,
  totalEarnings
}) => {
  if (!isOpen) return null;

  return (
    <div 
      id="trip-ledger-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div 
        id="trip-ledger-panel"
        className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl border border-neutral-200 p-5 text-[#111111] space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <div className="text-[10px] font-bold tracking-wider uppercase text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>FIRESTORE 'TRIPS' COLLECTION</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#111111] tracking-tight">
              Completed Trips Ledger
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Total stats pill */}
        <div className="bg-[#141414] rounded-2xl p-4 text-white flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[10px] uppercase font-semibold text-neutral-400">Total Fare Collected</div>
            <div className="text-2xl font-extrabold tracking-tight text-white mt-0.5">₹{totalEarnings}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-semibold text-neutral-400">Verified Trips</div>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{trips.length} Rides</div>
          </div>
        </div>

        {/* Trip list */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {trips.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                <Navigation className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-neutral-700">No completed trips yet</p>
              <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                Completed rides from the dashboard will dynamically calculate and display here in real time.
              </p>
            </div>
          ) : (
            trips.map((trip) => (
              <div 
                key={trip.id}
                className="bg-[#FAF8F5] border border-[#EAE4DB] rounded-2xl p-3 space-y-2 shadow-2xs hover:border-neutral-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{trip.passengerName || 'Passenger'}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-mono">
                      {trip.status}
                    </span>
                  </div>

                  <div className="text-sm font-extrabold text-emerald-700 font-mono">
                    +₹{trip.fare}
                  </div>
                </div>

                {/* Pickup & Drop */}
                <div className="text-[11px] space-y-1 text-neutral-700 pl-1 border-l-2 border-emerald-500 ml-1">
                  <div className="truncate font-medium flex items-center gap-1">
                    <span className="text-gray-400">From:</span>
                    <span>{trip.pickupName}</span>
                  </div>
                  <div className="truncate font-medium flex items-center gap-1">
                    <span className="text-gray-400">To:</span>
                    <span className="font-bold text-neutral-900">{trip.dropoffName}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 border-t border-[#EFEAE2]">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {trip.completedAt ? new Date(trip.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{trip.distanceKm ? `${trip.distanceKm} km` : '2.4 km'}</span>
                    <span className="uppercase font-bold text-neutral-700">{trip.paymentMethod || 'CASH'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-neutral-900 hover:bg-black text-white rounded-2xl text-xs font-bold transition-all cursor-pointer"
        >
          Close Ledger
        </button>
      </div>
    </div>
  );
};
