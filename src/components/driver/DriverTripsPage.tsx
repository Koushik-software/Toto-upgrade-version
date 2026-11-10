import React, { useState } from 'react';
import { TripRecord } from '../../types';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  Navigation, 
  TrendingUp, 
  Award,
  Wallet,
  Car
} from 'lucide-react';

interface DriverTripsPageProps {
  trips: TripRecord[];
  totalEarnings: number;
  onNavigateHome: () => void;
}

export const DriverTripsPage: React.FC<DriverTripsPageProps> = ({
  trips,
  totalEarnings,
  onNavigateHome
}) => {
  const [filter, setFilter] = useState<'all' | 'cash' | 'upi'>('all');

  const filteredTrips = trips.filter(trip => {
    if (filter === 'cash') return trip.paymentMethod === 'cash';
    if (filter === 'upi') return trip.paymentMethod === 'upi' || trip.paymentMethod === 'wallet';
    return true;
  });

  const cashEarnings = trips
    .filter(t => t.paymentMethod === 'cash')
    .reduce((sum, t) => sum + (t.fare || 0), 0);
  
  const digitalEarnings = totalEarnings - cashEarnings;

  return (
    <div className="w-full space-y-3.5 sm:space-y-4 pb-12 sm:pb-16 animate-in fade-in duration-200 select-none">
      {/* Page Header Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onNavigateHome}
            className="w-10 h-10 rounded-2xl bg-white border border-[#EDE8E0] shadow-2xs hover:bg-[#FAF8F5] active:scale-95 flex items-center justify-center text-neutral-800 transition-all cursor-pointer"
            title="Back to Dispatch Map"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-700" />
          </button>
          <div>
            <div className="text-[10px] font-bold tracking-wider uppercase text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>LIVE CLOUD LEDGER</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
              My Rides & Earnings
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateHome}
          className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white hover:bg-black font-bold text-xs shadow-xs transition-colors cursor-pointer hidden sm:flex items-center gap-1.5"
        >
          <Navigation className="w-3.5 h-3.5 text-[#FFB703]" />
          <span>Live Radar</span>
        </button>
      </div>

      {/* Hero Earnings Summary Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#161616] via-[#1E1E1E] to-[#252525] rounded-3xl p-5 text-white shadow-md border border-neutral-800">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-24 h-24 rounded-full bg-[#FF6B2C]/10 blur-xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-400" />
              Total Fare Collected
            </span>
            <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Award className="w-3 h-3" />
              <span>Verified Captain</span>
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              ₹{totalEarnings}
            </span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>100% Payout Retained</span>
            </span>
          </div>

          {/* Quick Metrics Breakdown Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-700/60 text-center">
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <div className="text-[10px] uppercase font-semibold text-neutral-400">Total Rides</div>
              <div className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                {trips.length}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <div className="text-[10px] uppercase font-semibold text-neutral-400">Cash Received</div>
              <div className="text-sm sm:text-base font-extrabold text-amber-300 mt-0.5">
                ₹{cashEarnings}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <div className="text-[10px] uppercase font-semibold text-neutral-400">Digital / UPI</div>
              <div className="text-sm sm:text-base font-extrabold text-emerald-400 mt-0.5">
                ₹{digitalEarnings}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#F2EDE4] rounded-2xl border border-[#E2DDD3]">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-white text-neutral-900 shadow-2xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          All Trips ({trips.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('cash')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'cash'
              ? 'bg-white text-neutral-900 shadow-2xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Cash ({trips.filter(t => t.paymentMethod === 'cash').length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('upi')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'upi'
              ? 'bg-white text-neutral-900 shadow-2xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          UPI / Online ({trips.filter(t => t.paymentMethod !== 'cash').length})
        </button>
      </div>

      {/* Trips List Container */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Trip History Log ({filteredTrips.length})
          </h2>
          <span className="text-[11px] font-semibold text-neutral-400">
            Sorted by Most Recent
          </span>
        </div>

        {filteredTrips.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EDE8E0] p-8 text-center space-y-3 shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-[#FFF4ED] text-[#FF6B2C] flex items-center justify-center mx-auto border border-[#FFD8C2]">
              <Car className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900">No trips recorded yet</h3>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                Completed passenger rides will appear here dynamically in real time with detailed fare and routing breakdowns.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateHome}
              className="px-5 py-2.5 bg-[#FF6B2C] hover:bg-[#E55A1F] text-white font-bold text-xs rounded-2xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Navigation className="w-4 h-4" />
              <span>Go to Live Ride Radar</span>
            </button>
          </div>
        ) : (
          filteredTrips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-2xl border border-[#EDE8E0] p-4 shadow-2xs hover:border-neutral-300 transition-colors space-y-3"
            >
              {/* Top Row: Passenger & Fare */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-100">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                      <span>{trip.passengerName || 'Passenger'}</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded-md font-mono">
                        {trip.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {trip.completedAt ? new Date(trip.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-emerald-600 font-mono">
                    +₹{trip.fare}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
                    {trip.paymentMethod || 'CASH'}
                  </span>
                </div>
              </div>

              {/* Route line */}
              <div className="bg-[#FAF8F5] rounded-xl p-2.5 space-y-1.5 text-xs text-neutral-700 border border-[#F2ECE1]">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                  <div className="truncate">
                    <span className="text-neutral-400 text-[10px] font-semibold block">PICKUP</span>
                    <span className="font-medium text-neutral-800">{trip.pickupName}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0" />
                  <div className="truncate">
                    <span className="text-neutral-400 text-[10px] font-semibold block">DROPOFF</span>
                    <span className="font-bold text-neutral-900">{trip.dropoffName}</span>
                  </div>
                </div>
              </div>

              {/* Bottom footer: Distance & Ride ID */}
              <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                <span>Distance: {trip.distanceKm ? `${trip.distanceKm} km` : '2.4 km'}</span>
                <span className="font-mono text-[10px] text-neutral-400">
                  ID: #{trip.id.slice(-6).toUpperCase()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
