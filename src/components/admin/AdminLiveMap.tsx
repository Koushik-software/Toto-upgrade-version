import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { InteractiveMap } from '../map/InteractiveMap';
import { DriverProfile, SimulatedDriverMarker } from '../../types';
import { 
  Radio, 
  Car, 
  BatteryCharging, 
  Star, 
  Phone, 
  MapPin, 
  Clock, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle,
  Eye,
  Filter,
  CheckCircle2
} from 'lucide-react';

export const AdminLiveMap: React.FC = () => {
  const { simulatedDrivers, activeRide, userGpsPoint, triggerSound } = useRide();
  const [selectedDriver, setSelectedDriver] = useState<SimulatedDriverMarker | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'busy'>('all');

  const filteredDrivers = simulatedDrivers.filter((d) => {
    if (filterStatus === 'available') return d.isAvailable;
    if (filterStatus === 'busy') return !d.isAvailable;
    return true;
  });

  const onlineCount = simulatedDrivers.length;
  const availableCount = simulatedDrivers.filter((d) => d.isAvailable).length;
  const inRideCount = simulatedDrivers.filter((d) => !d.isAvailable).length;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Live Fleet Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online Captains</span>
          </div>
          <div className="text-xl font-extrabold text-[#111111] mt-1">{onlineCount}</div>
          <p className="text-[10px] text-neutral-400">Broadcasting live GPS</p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-[#C8622A]" />
            <span>Available for Ride</span>
          </div>
          <div className="text-xl font-extrabold text-[#C8622A] mt-1">{availableCount}</div>
          <p className="text-[10px] text-neutral-400">Ready to accept trips</p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-600" />
            <span>In Transit</span>
          </div>
          <div className="text-xl font-extrabold text-blue-700 mt-1">{inRideCount}</div>
          <p className="text-[10px] text-neutral-400">Trips currently in progress</p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>GPS Freshness</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">99.8%</div>
          <p className="text-[10px] text-neutral-400">&lt; 5s latency threshold</p>
        </div>
      </div>

      {/* Filter and Control Strip */}
      <div className="bg-white p-3 rounded-2xl border border-neutral-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-400" />
          <span className="text-xs font-bold text-neutral-700">Display Filter:</span>
          <div className="flex items-center gap-1 bg-[#F6F4F0] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setFilterStatus('all'); triggerSound('beep'); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-white text-[#111111] shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All ({onlineCount})
            </button>
            <button
              type="button"
              onClick={() => { setFilterStatus('available'); triggerSound('beep'); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'available'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Available ({availableCount})
            </button>
            <button
              type="button"
              onClick={() => { setFilterStatus('busy'); triggerSound('beep'); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'busy'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              In Transit ({inRideCount})
            </button>
          </div>
        </div>

        <div className="text-xs text-neutral-500 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Real-time GPS synchronization active (1 sec interval)</span>
        </div>
      </div>

      {/* Main Map & Live Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Interactive Map View */}
        <div className="lg:col-span-2 rounded-3xl overflow-hidden border border-neutral-200 shadow-xs relative">
          <InteractiveMap
            mode="admin"
            drivers={filteredDrivers}
            activeRide={activeRide}
            pickup={activeRide?.pickup || userGpsPoint}
            dropoff={activeRide?.dropoff}
            heightClass="h-[460px]"
          />
        </div>

        {/* Live Driver Detail / Telemetry Inspector */}
        <div className="bg-white rounded-3xl p-4 border border-neutral-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-extrabold text-sm text-[#111111] flex items-center gap-1.5">
                <Car className="w-4 h-4 text-[#C8622A]" />
                <span>Live Captain Telemetry</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Feed
              </span>
            </div>

            {selectedDriver ? (
              <div className="pt-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center font-bold text-amber-800 text-lg">
                    {selectedDriver.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-[#111111]">{selectedDriver.name}</div>
                    <div className="text-xs text-neutral-500 font-mono">{selectedDriver.vehicleNumber}</div>
                    <div className="flex items-center gap-1 text-[11px] text-amber-600 font-bold mt-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{selectedDriver.rating || 4.9}</span>
                      <span className="text-neutral-400">•</span>
                      <span className="text-neutral-500 capitalize">{selectedDriver.vehicleType}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                    <div className="text-[10px] text-neutral-400 font-semibold uppercase">Status</div>
                    <div className="font-bold text-[#111111] mt-0.5">
                      {selectedDriver.isAvailable ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Available
                        </span>
                      ) : (
                        <span className="text-blue-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> On Trip
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                    <div className="text-[10px] text-neutral-400 font-semibold uppercase">Battery</div>
                    <div className="font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                      <BatteryCharging className="w-3.5 h-3.5" />
                      <span>{selectedDriver.batteryPercentage || 88}%</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                    <div className="text-[10px] text-neutral-400 font-semibold uppercase">Latitude</div>
                    <div className="font-mono text-neutral-700 mt-0.5 truncate">{selectedDriver.lat.toFixed(5)}</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                    <div className="text-[10px] text-neutral-400 font-semibold uppercase">Longitude</div>
                    <div className="font-mono text-neutral-700 mt-0.5 truncate">{selectedDriver.lng.toFixed(5)}</div>
                  </div>
                </div>

                <div className="text-xs text-neutral-600 bg-[#FAF8F5] p-2.5 rounded-xl border border-neutral-200">
                  <div className="font-bold text-[#111111] mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#C8622A]" />
                    <span>Current Sector</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Salt Lake Sector V, Bidhannagar, Kolkata (Within 2.0 km dispatch radius)
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                  <Eye className="w-5 h-5" />
                </div>
                <div className="font-bold text-xs text-neutral-700">Select a Captain from the list</div>
                <p className="text-[11px] text-neutral-400">
                  Click any driver below or on the map to inspect real-time GPS and vehicle parameters.
                </p>
              </div>
            )}

            {/* Quick Captain Directory List */}
            <div className="mt-4 space-y-2 max-h-[160px] overflow-y-auto pr-1">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Active Drivers on Map ({filteredDrivers.length})
              </div>
              {filteredDrivers.map((driver) => (
                <div
                  key={driver.id}
                  onClick={() => { setSelectedDriver(driver); triggerSound('beep'); }}
                  className={`p-2 rounded-xl text-xs flex items-center justify-between border transition-all cursor-pointer ${
                    selectedDriver?.id === driver.id
                      ? 'bg-amber-50 border-amber-300 shadow-2xs ring-1 ring-amber-400/40'
                      : 'bg-white hover:bg-neutral-50 border-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${driver.isAvailable ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    <div className="font-semibold text-neutral-800">{driver.name}</div>
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500">{driver.vehicleNumber}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-100 text-[10px] text-neutral-400 flex items-center justify-between">
            <span>Powered by OSRM & CARTO</span>
            <span>Refreshed: Just now</span>
          </div>
        </div>
      </div>
    </div>
  );
};
