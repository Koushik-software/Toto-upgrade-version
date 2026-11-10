import React, { useState, useEffect, useRef } from 'react';
import { GeoPoint, SavedPlaceItem } from '../../types';
import { POPULAR_LOCATIONS } from '../../data/appData';
import { searchPlacesOnline } from '../../utils/geoUtils';
import { 
  Search, 
  MapPin, 
  Clock, 
  Home, 
  Briefcase, 
  Star, 
  X, 
  Navigation, 
  Building, 
  Train, 
  ShoppingBag,
  RotateCw
} from 'lucide-react';

interface DestinationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (point: GeoPoint) => void;
  currentGpsPoint?: GeoPoint | null;
  savedPlaces?: SavedPlaceItem[];
  recentDestinations?: GeoPoint[];
}

export const DestinationSearchModal: React.FC<DestinationSearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentGpsPoint,
  savedPlaces = [],
  recentDestinations = []
}) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoPoint[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const centerLat = currentGpsPoint?.lat || 22.5804;
        const centerLng = currentGpsPoint?.lng || 88.4378;
        const results = await searchPlacesOnline(trimmed, centerLat, centerLng);
        setSearchResults(results);
      } catch (err) {
        console.debug('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, currentGpsPoint]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] border border-neutral-200">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-neutral-100 flex items-center gap-3">
          <div className="flex-1 flex items-center bg-neutral-100 rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#E07A00] transition-all">
            <Search className="w-4 h-4 text-neutral-400 shrink-0 mr-2.5" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Where are you going? (Mall, Station, Tech Park...)"
              className="w-full bg-transparent text-sm font-semibold text-neutral-900 placeholder-neutral-400 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-full hover:bg-neutral-200 text-neutral-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-neutral-100 text-neutral-500 font-bold text-xs transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Results / Suggestions Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Online Search Results */}
          {query.trim().length >= 2 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-400 px-1">
                <span>SEARCH RESULTS</span>
                {isSearching && (
                  <span className="flex items-center gap-1 text-[#E07A00]">
                    <RotateCw className="w-3 h-3 animate-spin" /> Searching...
                  </span>
                )}
              </div>

              {searchResults.length > 0 ? (
                <div className="divide-y divide-neutral-100">
                  {searchResults.map((point, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onSelect(point);
                        onClose();
                      }}
                      className="w-full text-left p-3 rounded-2xl hover:bg-neutral-50 active:bg-neutral-100 flex items-start gap-3 transition-colors cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-[#FFF3C4] text-[#E07A00] shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-neutral-900 truncate">
                          {point.name}
                        </p>
                        <p className="text-xs text-neutral-500 line-clamp-1">
                          {point.address}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : !isSearching ? (
                <div className="p-8 text-center text-xs text-neutral-400">
                  No places found. Try searching a landmark like "Sector V Metro" or "City Centre".
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {/* Quick Actions: Saved Places */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const home = savedPlaces.find((p) => p.type === 'home');
                    if (home) {
                      onSelect({ name: home.name, address: home.address, lat: home.lat, lng: home.lng });
                      onClose();
                    } else {
                      setQuery('Home');
                    }
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-neutral-50 hover:bg-[#FFF9E6] border border-neutral-100 text-left transition-colors cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900">Home</div>
                    <div className="text-[10px] text-neutral-500 truncate max-w-[120px]">
                      {savedPlaces.find((p) => p.type === 'home')?.address || 'Set address'}
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    const work = savedPlaces.find((p) => p.type === 'work');
                    if (work) {
                      onSelect({ name: work.name, address: work.address, lat: work.lat, lng: work.lng });
                      onClose();
                    } else {
                      setQuery('Office');
                    }
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-neutral-50 hover:bg-[#FFF9E6] border border-neutral-100 text-left transition-colors cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900">Work</div>
                    <div className="text-[10px] text-neutral-500 truncate max-w-[120px]">
                      {savedPlaces.find((p) => p.type === 'work')?.address || 'Set address'}
                    </div>
                  </div>
                </button>
              </div>

              {/* Popular Hubs in Kolkata */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                  Popular E-Rickshaw Destinations
                </div>
                <div className="divide-y divide-neutral-100">
                  {POPULAR_LOCATIONS.slice(0, 6).map((loc, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onSelect(loc);
                        onClose();
                      }}
                      className="w-full text-left p-3 rounded-2xl hover:bg-neutral-50 active:bg-neutral-100 flex items-start gap-3 transition-colors cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-neutral-100 text-neutral-600 shrink-0 mt-0.5">
                        {loc.zone?.includes('Metro') || loc.zone?.includes('Transit') ? (
                          <Train className="w-4 h-4 text-[#E07A00]" />
                        ) : loc.zone?.includes('Shopping') ? (
                          <ShoppingBag className="w-4 h-4 text-purple-600" />
                        ) : (
                          <Building className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-neutral-900 truncate">
                            {loc.name}
                          </p>
                          {loc.zone && (
                            <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-1.5 py-0.2 rounded-md shrink-0">
                              {loc.zone}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-1">
                          {loc.landmark || loc.address}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
