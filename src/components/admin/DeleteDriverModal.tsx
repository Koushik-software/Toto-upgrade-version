import React, { useState } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  X, 
  ShieldAlert, 
  Check, 
  Phone, 
  Car, 
  RotateCw,
  FileWarning
} from 'lucide-react';
import { DriverApprovalRequest } from '../../types';

interface DriverTarget {
  id: string;
  driverName: string;
  phone: string;
  vehicleNumber: string;
  vehicleModel?: string;
  vehicleColor?: string;
  driverPhoto?: string;
  status?: string;
  generatedPin?: string;
}

interface DeleteDriverModalProps {
  driver: DriverTarget | DriverApprovalRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (driver: DriverTarget | DriverApprovalRequest, reason: string) => Promise<void>;
}

const PRESET_REASONS = [
  'Failed KYC / Fraudulent Documents',
  'Driver Resignation / Inactive Account',
  'Safety or Disciplinary Policy Violation',
  'Toto Vehicle Sold or De-registered',
  'Duplicate Registration Record',
  'Testing & Quality Simulation Clean-up'
];

export const DeleteDriverModal: React.FC<DeleteDriverModalProps> = ({
  driver,
  isOpen,
  onClose,
  onConfirmDelete
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_REASONS[0]);
  const [customNote, setCustomNote] = useState<string>('');
  const [confirmChecked, setConfirmChecked] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  if (!isOpen || !driver) return null;

  const handleDelete = async () => {
    if (!confirmChecked) return;
    setIsDeleting(true);
    try {
      const fullReason = customNote ? `${selectedReason} - ${customNote}` : selectedReason;
      await onConfirmDelete(driver, fullReason);
      onClose();
    } catch (err) {
      console.error('Delete driver failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div 
      id="delete-driver-modal-backdrop"
      className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div 
        id="delete-driver-modal-container"
        className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-rose-200 space-y-4 max-h-[92vh] flex flex-col justify-between"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <Trash2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base sm:text-lg font-black text-rose-950 tracking-tight">
                  Delete Driver Profile
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider">
                  Permanent
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Revoke credentials and permanently remove captain from fleet
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto space-y-4 pr-1 text-xs no-scrollbar">
          {/* Driver Snapshot Card */}
          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center gap-3">
            {driver.driverPhoto ? (
              <img
                src={driver.driverPhoto}
                alt={driver.driverName}
                className="w-13 h-13 rounded-2xl object-cover border-2 border-rose-200 shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-13 h-13 rounded-2xl bg-neutral-200 text-neutral-800 flex items-center justify-center font-black text-base shrink-0">
                {driver.driverName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-neutral-900 truncate">
                  {driver.driverName}
                </h4>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-neutral-200 text-neutral-800">
                  {driver.status === 'approved' ? 'Active Captain' : 'Pending Review'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-neutral-600 text-[11px]">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-neutral-400" />
                  <strong className="font-mono">{driver.phone}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Car className="w-3 h-3 text-neutral-400" />
                  <span className="font-mono font-bold text-neutral-800">{driver.vehicleNumber}</span>
                </span>
              </div>
              {driver.vehicleModel && (
                <div className="text-[10px] text-neutral-500 truncate">
                  {driver.vehicleModel} • {driver.vehicleColor || 'Electric Green'}
                </div>
              )}
            </div>
          </div>

          {/* Critical Impact Warnings */}
          <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-rose-900 font-extrabold text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Consequences of Deleting this Captain:</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-rose-800 list-disc list-inside">
              <li>
                <strong>Immediate PIN Revocation:</strong> Login credentials will be wiped. The driver will be disconnected from active service.
              </li>
              <li>
                <strong>Dispatch Removal:</strong> This Toto vehicle will no longer appear on passenger booking radars or the central live map.
              </li>
              <li>
                <strong>Database Purge:</strong> Stored KYC records, government verification flags, and inspection photos will be deleted.
              </li>
            </ul>
          </div>

          {/* Deletion Reason Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-800">
              Select Reason for Profile Deletion:
            </label>
            <div className="space-y-1.5">
              {PRESET_REASONS.map((reason) => (
                <label 
                  key={reason}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    selectedReason === reason 
                      ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold' 
                      : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="w-3.5 h-3.5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span className="text-[11px]">{reason}</span>
                </label>
              ))}
            </div>

            {/* Custom notes */}
            <div className="pt-1">
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Optional administrative note or incident ticket ID..."
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-neutral-200 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-rose-400"
              />
            </div>
          </div>

          {/* Required Safety Verification Checkbox */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                id="confirm-delete-driver-checkbox"
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
              />
              <span className="text-xs text-amber-950 font-semibold leading-tight">
                I understand this action is irreversible and permanently removes{' '}
                <strong className="text-neutral-950">{driver.driverName}</strong> ({driver.vehicleNumber}) from the Toto fleet.
              </span>
            </label>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="py-2.5 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-bold text-xs transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            id="confirm-delete-driver-btn"
            type="button"
            disabled={!confirmChecked || isDeleting}
            onClick={handleDelete}
            className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting Profile...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm & Delete Driver</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
