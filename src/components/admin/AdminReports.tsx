import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  DollarSign, 
  Car, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export const AdminReports: React.FC = () => {
  const { allRides, allDrivers, triggerSound } = useRide();
  const [dateRange, setDateRange] = useState<'today' | '7days' | 'month' | 'year'>('today');

  // Filter rides based on selected timeframe
  const now = new Date();
  const filteredRides = allRides.filter((ride) => {
    if (!ride.createdAt && !ride.acceptedAt) return true;
    const rideDate = new Date(ride.createdAt || ride.acceptedAt || Date.now());
    if (isNaN(rideDate.getTime())) return true;

    if (dateRange === 'today') {
      return rideDate.toDateString() === now.toDateString();
    }
    if (dateRange === '7days') {
      const diffDays = (now.getTime() - rideDate.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    }
    if (dateRange === 'month') {
      const diffDays = (now.getTime() - rideDate.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 30;
    }
    return true; // year / all
  });

  const completedRides = filteredRides.filter((r) => r.status === 'completed');
  const cancelledRides = filteredRides.filter((r) => r.status === 'cancelled');

  const totalRevenue = completedRides.reduce((acc, r) => acc + (Number((r as any).totalFare ?? r.fare) || 0), 0);
  const platformFee = Math.round(totalRevenue * 0.10); // 10% platform commission
  const driverPayout = totalRevenue - platformFee;
  const totalBookings = filteredRides.length;
  const completedTrips = completedRides.length;
  const cancelledTrips = cancelledRides.length;
  const activeCaptains = allDrivers.filter((d) => d.isOnline).length;
  const totalKmTraveled = completedRides.reduce((acc, r) => acc + (Number(r.distanceKm) || 0), 0);
  const fuelSavedLitres = Math.round(totalKmTraveled * 0.08); // Clean electric substitution factor

  const completionRate = totalBookings > 0 ? ((completedTrips / totalBookings) * 100).toFixed(1) : '0.0';
  const cancellationRate = totalBookings > 0 ? ((cancelledTrips / totalBookings) * 100).toFixed(1) : '0.0';

  // Fleet share calculation
  const totoTrips = completedRides.filter((r) => !r.vehicleType || r.vehicleType === 'toto').length;
  const totoPct = completedTrips > 0 ? Math.round((totoTrips / completedTrips) * 100) : 0;

  const handleExportCSV = () => {
    triggerSound('success');
    const headers = ['Date', 'Ride_ID', 'Passenger_Name', 'Captain_Name', 'Vehicle_Number', 'Distance_KM', 'Fare_INR', 'Platform_Fee_INR', 'Payment_Method', 'Status'];
    
    const rows = filteredRides.map((r) => [
      `"${r.createdAt || r.bookedAt || new Date().toISOString()}"`,
      `"${r.id}"`,
      `"${r.userName || 'Passenger'}"`,
      `"${r.driverName || 'Captain'}"`,
      `"${r.vehicleNumber || 'N/A'}"`,
      `"${r.distanceKm || '0'}"`,
      `"${(r as any).totalFare ?? r.fare ?? 0}"`,
      `"${Math.round((Number((r as any).totalFare ?? r.fare) || 0) * 0.1)}"`,
      `"${r.paymentMethod || 'cash'}"`,
      `"${(r.status || 'unknown').toUpperCase()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rapido_toto_analytics_${dateRange}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Filter and Export Bar */}
      <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#F6F4F0] p-1 rounded-2xl">
          {(['today', '7days', 'month', 'year'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { setDateRange(r); triggerSound('beep'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                dateRange === r
                  ? 'bg-white text-[#111111] shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {r === '7days' ? 'Last 7 Days' : r}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-2xl bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Ledger to CSV</span>
        </button>
      </div>

      {/* Primary Financial Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-2xs">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            Gross Bookings Value (GMV)
          </div>
          <div className="text-3xl font-extrabold text-[#111111] mt-2 font-mono">
            ₹{totalRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Active Period Gross</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-2xs">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            Platform Net Commission (10%)
          </div>
          <div className="text-3xl font-extrabold text-[#C8622A] mt-2 font-mono">
            ₹{platformFee.toLocaleString()}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Direct system platform fee</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-2xs">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            Captain Net Disbursal (90%)
          </div>
          <div className="text-3xl font-extrabold text-emerald-700 mt-2 font-mono">
            ₹{driverPayout.toLocaleString()}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Paid directly to Toto drivers</p>
        </div>
      </div>

      {/* Operational Efficiency Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="text-[10px] text-neutral-400 uppercase font-bold">Total Bookings</div>
          <div className="font-extrabold text-xl text-neutral-900 mt-1">{totalBookings}</div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="text-[10px] text-neutral-400 uppercase font-bold">Completed Rate</div>
          <div className="font-extrabold text-xl text-emerald-600 mt-1">
            {completionRate}%
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="text-[10px] text-neutral-400 uppercase font-bold">Cancellation Rate</div>
          <div className="font-extrabold text-xl text-rose-600 mt-1">
            {cancellationRate}%
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="text-[10px] text-neutral-400 uppercase font-bold">Clean Energy Saved</div>
          <div className="font-extrabold text-xl text-emerald-600 mt-1">{fuelSavedLitres} L</div>
        </div>
      </div>

      {/* Fleet Distribution Breakdown */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-sm text-[#111111] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#C8622A]" />
            <span>Fleet Performance Distribution</span>
          </h4>
          <span className="text-xs text-neutral-500 font-medium">
            Active Captains: <strong>{activeCaptains}</strong>
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <div className="flex justify-between font-semibold pb-1">
              <span>Toto Partner Electric (E-Rickshaw)</span>
              <span>{totoPct}% of trips ({totoTrips} completed)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${totoPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
