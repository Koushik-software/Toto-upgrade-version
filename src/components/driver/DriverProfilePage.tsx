import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { 
  ArrowLeft, 
  Check, 
  ShieldCheck, 
  RotateCw, 
  Lock, 
  Eye, 
  EyeOff, 
  BatteryCharging, 
  Phone, 
  Palette,
  Car,
  LogOut,
  AlertCircle
} from 'lucide-react';

interface DriverProfilePageProps {
  onNavigateHome: () => void;
}

const COLOR_OPTIONS = [
  { name: 'Emerald Green', hex: '#10B981', border: 'border-emerald-600' },
  { name: 'Canary Yellow', hex: '#EAB308', border: 'border-yellow-600' },
  { name: 'Saffron Orange', hex: '#F97316', border: 'border-orange-600' },
  { name: 'Electric Blue', hex: '#3B82F6', border: 'border-blue-600' },
  { name: 'Pearl White', hex: '#F8FAFC', border: 'border-slate-400' },
  { name: 'Midnight Charcoal', hex: '#334155', border: 'border-slate-700' }
];

const MODEL_PRESETS = [
  'GreenPower Lithium E-Toto Deluxe',
  'Mayuri Deluxe Li-ion E-Rickshaw',
  'CityRide Eco-Toto Plus',
  'Kinetic Green Zing E-Rickshaw',
  'Saarthi Shavak E-Rickshaw',
  'Terra Motors Y4A High-Speed'
];

export const DriverProfilePage: React.FC<DriverProfilePageProps> = ({ onNavigateHome }) => {
  const { driver, updateDriverVehicleDetails, logoutDriver, triggerSound } = useRide();

  const [registrationNumber, setRegistrationNumber] = useState(driver?.vehicleNumber || 'WB-06-ER-4821');
  const [vehicleModel, setVehicleModel] = useState(driver?.vehicleModel || 'Mayuri Deluxe Li-ion E-Rickshaw');
  const [vehicleColor, setVehicleColor] = useState(driver?.vehicleColor || 'Emerald Green');
  const [batteryPercentage, setBatteryPercentage] = useState(driver?.batteryPercentage || 92);
  const [upiId, setUpiId] = useState(driver?.upiId || (driver?.phone ? `${driver.phone.replace(/\D/g, '')}@upi` : ''));
  const [showPin, setShowPin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!driver) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationNumber.trim()) {
      setErrorMsg('Please enter a valid registration number');
      return;
    }
    if (!vehicleModel.trim()) {
      setErrorMsg('Please specify your Toto vehicle model');
      return;
    }

    setErrorMsg('');
    setIsSaving(true);
    triggerSound('beep');

    try {
      await updateDriverVehicleDetails({
        vehicleNumber: registrationNumber.trim().toUpperCase(),
        vehicleModel: vehicleModel.trim(),
        vehicleColor: vehicleColor.trim(),
        batteryPercentage: Number(batteryPercentage),
        upiId: upiId.trim()
      });
      setSaveSuccess(true);
      triggerSound('success');
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);
    } catch (err) {
      console.error('Failed to update vehicle details in database:', err);
      setErrorMsg('Failed to update vehicle details in database. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-3.5 sm:space-y-4 pb-12 sm:pb-16 animate-in fade-in duration-200 select-none">
      {/* Page Header */}
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
            <div className="text-[10px] font-bold tracking-wider uppercase text-[#C8622A] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B2C]"></span>
              <span>CAPTAIN CREDENTIALS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
              Profile & Vehicle Setup
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setShowLogoutConfirm(true); triggerSound('beep'); }}
          className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5 text-red-600" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Driver Identity Card */}
      <div className="bg-white rounded-3xl p-5 border border-[#EDE8E0] shadow-2xs space-y-4">
        <div className="flex items-center gap-3.5">
          {driver.driverPhoto || driver.avatarUrl ? (
            <img
              src={driver.driverPhoto || driver.avatarUrl}
              alt={driver.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF8C38] to-[#FF5E00] text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
              {driver.name ? driver.name.charAt(0) : 'D'}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-extrabold text-neutral-900 truncate">
                {driver.name || 'Captain Driver'}
              </h2>
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            </div>
            <p className="text-xs text-neutral-500 truncate flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 text-neutral-400" />
              <span>{driver.phone || '+91 98311 00000'}</span>
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Active Kolkata Pilot</span>
              </span>
              <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                ★ 4.9 Rating
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Details & Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-white rounded-3xl p-5 border border-[#EDE8E0] shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FFF4ED] text-[#FF6B2C] flex items-center justify-center">
                <Car className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-neutral-900">
                Toto Vehicle Specifications
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-neutral-400">
              Syncs to passenger radar
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 animate-in fade-in duration-200">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Vehicle profile updated and synced successfully!</span>
            </div>
          )}

          {/* Registration Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 flex items-center justify-between">
              <span>Vehicle Registration No.</span>
              <span className="text-[10px] text-neutral-400 font-mono">Format: WB-XX-XX-XXXX</span>
            </label>
            <input
              type="text"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
              placeholder="WB-06-ER-4821"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-[#FAF8F5] focus:bg-white focus:border-[#FF6B2C] focus:ring-2 focus:ring-[#FF6B2C]/20 text-sm font-mono font-bold tracking-wider uppercase transition-all"
            />
          </div>

          {/* Vehicle Model */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700">
              E-Rickshaw Model
            </label>
            <input
              type="text"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="e.g. Mayuri Deluxe Li-ion"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-[#FAF8F5] focus:bg-white focus:border-[#FF6B2C] focus:ring-2 focus:ring-[#FF6B2C]/20 text-sm font-semibold transition-all"
            />

            {/* Quick Model Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {MODEL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setVehicleModel(preset)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    vehicleModel === preset
                      ? 'bg-[#181818] text-white border-neutral-800 font-bold'
                      : 'bg-[#FAF8F5] hover:bg-[#F2ECE1] border-neutral-200 text-neutral-600'
                  }`}
                >
                  {preset.split(' ')[0]} {preset.split(' ')[1]}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle Color Swatches */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-neutral-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-neutral-400" />
                <span>Vehicle Body Color</span>
              </span>
              <span className="text-xs font-bold text-[#FF6B2C]">{vehicleColor}</span>
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {COLOR_OPTIONS.map((c) => {
                const isSelected = vehicleColor.toLowerCase() === c.name.toLowerCase();
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setVehicleColor(c.name)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#FF6B2C] bg-[#FFF4ED] shadow-2xs'
                        : 'border-neutral-200 hover:border-neutral-300 bg-[#FAF8F5]'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full border border-black/10 shadow-2xs flex items-center justify-center"
                      style={{ backgroundColor: c.hex }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-md stroke-[3]" />}
                    </div>
                    <span className="text-[10px] font-semibold text-neutral-700 truncate w-full text-center">
                      {c.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Battery State Gauge */}
          <div className="space-y-2 pt-1 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4 text-emerald-600" />
                <span>Lithium Battery Level</span>
              </label>
              <span className="text-sm font-black font-mono text-emerald-600">
                {batteryPercentage}%
              </span>
            </div>

            <input
              type="range"
              min="10"
              max="100"
              value={batteryPercentage}
              onChange={(e) => setBatteryPercentage(Number(e.target.value))}
              className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-neutral-400 font-semibold px-0.5">
              <span>10% (Low)</span>
              <span>50% (Normal)</span>
              <span>100% (Full Charge)</span>
            </div>
          </div>
        </div>

        {/* Driver Personal UPI ID & Direct QR Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#EDE8E0] shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                UPI
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-neutral-900">
                  Captain Direct UPI ID & QR
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Where passengers send direct QR payments and your daily earnings are settled
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
              Live QR Active
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-700">
              Your UPI VPA Address
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. 9830145289@paytm or yourname@okhdfcbank"
              className="w-full bg-[#FAF8F5] rounded-xl border border-neutral-300 focus:border-emerald-600 px-3.5 py-2.5 text-xs font-mono font-bold text-[#111111] focus:outline-hidden transition-colors"
            />
            <p className="text-[11px] text-neutral-500">
              Accepts payments from PhonePe, Google Pay, Paytm, BHIM and all banking UPI apps.
            </p>
          </div>
        </div>

        {/* Security & Credentials Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#EDE8E0] shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-neutral-900">
                Security & Pilot Credentials
              </h3>
            </div>
            <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-mono">
              ID: {driver.id.slice(0, 8)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 text-xs">
            <span className="font-semibold text-neutral-600">Captain Login PIN</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold tracking-widest text-neutral-900">
                {showPin ? (driver.pin || '4821') : '••••'}
              </span>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1 text-xs border-t border-neutral-100">
            <span className="font-semibold text-neutral-600">Assigned Dispatch Zone</span>
            <span className="font-bold text-neutral-900">Kolkata Sector V / Salt Lake</span>
          </div>
        </div>

        {/* Save Changes Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#141414] hover:bg-black active:scale-[0.99] text-white font-extrabold text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin text-[#FF6B2C]" />
              <span>Saving Vehicle Changes...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
              <span>Save & Sync Vehicle Details</span>
            </>
          )}
        </button>
      </form>

      {/* Sign Out Confirmation Modal */}
      {showLogoutConfirm && (
        <div 
          id="driver-logout-modal-backdrop"
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 pb-6 sm:pb-4 animate-in fade-in duration-200"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div 
            id="driver-logout-modal"
            className="bg-white w-full max-w-sm sm:max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-neutral-200 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 mb-2 sm:mb-0 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Bottom Sheet Pull Indicator */}
            <div className="w-10 h-1 rounded-full bg-neutral-200 mx-auto -mt-1 mb-2 sm:hidden" />

            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100 shadow-2xs">
              <LogOut className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">Sign Out of Captain Mode?</h3>
              <p className="text-xs sm:text-sm text-neutral-500 max-w-xs mx-auto px-1 leading-relaxed">
                You will go offline and will not receive any passenger ride alerts until you sign back in.
              </p>
            </div>
            <div className="flex gap-2.5 sm:gap-3 pt-1.5">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 sm:py-3.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-700 font-bold text-xs sm:text-sm transition-all cursor-pointer text-center"
              >
                Stay Online
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logoutDriver();
                  triggerSound('beep');
                }}
                className="flex-1 py-3 sm:py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs shadow-red-200 text-center flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Yes, Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
