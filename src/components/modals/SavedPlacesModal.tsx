import React, { useState } from 'react';
import { SavedPlaceItem, GeoPoint } from '../../types';
import { 
  Home, 
  Briefcase, 
  MapPin, 
  Plus, 
  Trash2, 
  X, 
  Check, 
  Building 
} from 'lucide-react';

interface SavedPlacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedPlaces: SavedPlaceItem[];
  onAddPlace: (place: Omit<SavedPlaceItem, 'id' | 'createdAt'>) => Promise<void>;
  onDeletePlace: (placeId: string) => Promise<void>;
  onSelectPlace?: (point: GeoPoint) => void;
}

export const SavedPlacesModal: React.FC<SavedPlacesModalProps> = ({
  isOpen,
  onClose,
  savedPlaces,
  onAddPlace,
  onDeletePlace,
  onSelectPlace
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [type, setType] = useState<'home' | 'work' | 'other'>('home');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    setIsSaving(true);
    try {
      await onAddPlace({
        userId: 'current',
        type,
        name: name.trim(),
        address: address.trim(),
        lat: 22.5804 + (Math.random() - 0.5) * 0.02,
        lng: 88.4378 + (Math.random() - 0.5) * 0.02
      });
      setShowAddForm(false);
      setName('');
      setAddress('');
    } catch (err) {
      console.error('Failed to save place:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-neutral-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#FFF3C4] text-[#8C5200]">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-neutral-900">Saved Places</h3>
              <p className="text-[11px] text-neutral-500 font-medium">Quick 1-tap booking destinations</p>
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
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-neutral-800">Your Locations</span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs text-[#E07A00] font-bold hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddForm ? 'Cancel' : 'Add New Place'}
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <form onSubmit={handleSave} className="p-3 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-2.5 text-xs">
              <div className="flex gap-2">
                {(['home', 'work', 'other'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-1.5 rounded-xl capitalize font-bold text-xs transition-colors ${
                      type === t ? 'bg-[#E07A00] text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (e.g. My Apartment, Sector V Office)"
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#E07A00]"
                required
              />

              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full Street Address"
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#E07A00]"
                required
              />

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-[#E07A00] text-white py-2 rounded-xl font-bold text-xs transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Place'}
              </button>
            </form>
          )}

          {/* Places List */}
          {savedPlaces.length > 0 ? (
            <div className="space-y-2">
              {savedPlaces.map((place) => {
                const Icon = place.type === 'home' ? Home : place.type === 'work' ? Briefcase : MapPin;
                return (
                  <div
                    key={place.id}
                    className="p-3 bg-neutral-50 hover:bg-[#FFF9E6] rounded-2xl border border-neutral-200 flex items-center justify-between transition-colors group cursor-pointer"
                    onClick={() => {
                      if (onSelectPlace) {
                        onSelectPlace({
                          name: place.name,
                          address: place.address,
                          lat: place.lat,
                          lng: place.lng
                        });
                        onClose();
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white border border-neutral-200 text-[#E07A00]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-neutral-900">{place.name}</div>
                        <div className="text-[11px] text-neutral-500 line-clamp-1">{place.address}</div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePlace(place.id);
                      }}
                      className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete place"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic text-center py-4">
              No saved places yet. Save Home & Work for 1-click e-rickshaw dispatch!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
