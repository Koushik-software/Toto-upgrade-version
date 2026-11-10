import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { 
  X, 
  Check, 
  ShieldCheck, 
  RotateCw, 
  Lock, 
  Eye, 
  EyeOff, 
  BatteryCharging, 
  Phone, 
  User, 
  Zap, 
  Sparkles,
  Palette
} from 'lucide-react';

interface DriverSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const DriverSettingsModal: React.FC<DriverSettingsModalProps> = ({ isOpen, onClose }) => {
  const { driver, updateDriverVehicleDetails, triggerSound } = useRide();

  const [registrationNumber, setRegistrationNumber] = useState(driver?.vehicleNumber || 'WB-06-ER-4821');
  const [vehicleModel, setVehicleModel] = useState(driver?.vehicleModel || 'Mayuri Deluxe Li-ion E-Rickshaw');
  const [vehicleColor, setVehicleColor] = useState(driver?.vehicleColor || 'Emerald Green');
  const [batteryPercentage, setBatteryPercentage] = useState(driver?.batteryPercentage || 92);
  const [upiId, setUpiId] = useState(driver?.upiId || (driver?.phone ? `${driver.phone.replace(/\D/g, '')}@upi` : ''));
  const [showPin, setShowPin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !driver) return null;

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
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to update vehicle details in Firestore:', err);
      setErrorMsg('Failed to update Firestore document. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      id="driver-settings-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div 
        id="driver-settings-panel"
        className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200 p-6 text-[#111111] space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B2C]/10 text-[#FF6B2C] flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#111111] tracking-tight">
                Vehicle & Driver Profile
              </h2>
              <p className="text-xs text-neutral-500">
                Real-time sync to Firestore document
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-driver-settings-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Read-Only Captain & Security Info Card */}
        <div className="bg-[#FAF8F5] border border-[#EFEAE2] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-[#181818] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                {driver.name ? driver.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div>
                <div className="text-sm font-bold text-[#111111]">{driver.name}</div>
                <div className="text-xs text-neutral-500 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-neutral-400" />
                  <span>{driver.phone}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                <ShieldCheck className="w-3 h-3" />
                <span>{driver.approvalStatus?.toUpperCase() || 'APPROVED'}</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-500">ID: {driver.id}</span>
            </div>
          </div>

          {/* 4-Digit Security PIN Card */}
          <div className="pt-2 border-t border-[#EAE4DB] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-neutral-700 font-semibold">
              <Lock className="w-3.5 h-3.5 text-[#C8622A]" />
              <span>4-Digit Security Login PIN:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold tracking-widest bg-white border border-[#E0D8CE] px-2.5 py-1 rounded-lg text-sm">
                {showPin ? (driver.pin || '1234') : '••••'}
              </span>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="p-1 text-neutral-500 hover:text-black cursor-pointer"
                title={showPin ? 'Hide PIN' : 'Reveal PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Editable Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Toto Registration Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-800">
              Toto Registration Plate (Number)
            </label>
            <input
              id="settings-vehicle-number-input"
              type="text"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. WB-06-ER-4821"
              className="w-full bg-[#FAF8F5] rounded-2xl border border-neutral-300 focus:border-black px-4 py-3 text-sm font-mono font-bold text-[#111111] uppercase tracking-wider focus:outline-hidden transition-colors"
            />
          </div>

          {/* Toto Model */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-neutral-800">
                Toto Brand / Model
              </label>
              <span className="text-[10px] text-neutral-500 font-medium">Choose or type</span>
            </div>
            <input
              id="settings-vehicle-model-input"
              type="text"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="e.g. Mayuri Deluxe Lithium"
              className="w-full bg-[#FAF8F5] rounded-2xl border border-neutral-300 focus:border-black px-4 py-3 text-sm font-semibold text-[#111111] focus:outline-hidden transition-colors"
            />
            {/* Quick model pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {MODEL_PRESETS.slice(0, 3).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setVehicleModel(preset)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                    vehicleModel === preset 
                      ? 'bg-neutral-900 text-white border-neutral-900' 
                      : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
                  }`}
                >
                  {preset.split(' ')[0]} {preset.split(' ')[1]}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle Color Swatches */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#FF6B2C]" />
                <span>Toto Body Color:</span>
                <span className="text-[#FF6B2C] font-extrabold">{vehicleColor}</span>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setVehicleColor(c.name)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    vehicleColor === c.name
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs scale-[1.02]'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <span 
                    className={`w-4 h-4 rounded-full shadow-2xs border ${c.border}`} 
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="truncate">{c.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Battery Percentage Slider */}
          <div className="space-y-1.5 bg-[#FAF8F5] border border-[#EFEAE2] p-3 rounded-2xl">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-800 flex items-center gap-1">
                <BatteryCharging className="w-4 h-4 text-emerald-600" />
                <span>Battery Level:</span>
              </span>
              <span className="font-mono font-extrabold text-emerald-600 text-sm">
                {batteryPercentage}%
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={100}
              value={batteryPercentage}
              onChange={(e) => setBatteryPercentage(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          {/* Captain Personal UPI ID */}
          <div className="space-y-1.5 p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-emerald-950">
                Personal UPI ID (VPA) for Passenger QR
              </label>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                Direct QR
              </span>
            </div>
            <input
              id="settings-driver-upi-input"
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. 9830145289@paytm or captain@okhdfcbank"
              className="w-full bg-white rounded-xl border border-emerald-300 focus:border-emerald-600 px-3.5 py-2.5 text-xs font-mono font-bold text-[#111111] focus:outline-hidden transition-colors"
            />
            <p className="text-[11px] text-emerald-800/80 leading-tight">
              When you tap "Show UPI QR Code" on a trip, passenger scans this UPI ID directly to pay.
            </p>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded-xl border border-red-200">
              {errorMsg}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3 px-4 rounded-2xl border border-neutral-300 hover:bg-neutral-100 font-bold text-xs text-neutral-700 transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              id="save-vehicle-settings-btn"
              type="submit"
              disabled={isSaving}
              className={`flex-2 py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#FF6B2C] hover:bg-[#E55A1F] active:scale-[0.98] text-white disabled:opacity-75'
              }`}
            >
              {isSaving ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Saving to Firestore...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved in Real-Time!</span>
                </>
              ) : (
                <span>Save Vehicle Details</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
