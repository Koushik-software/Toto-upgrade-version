import React, { useState } from 'react';
import { Star, X, Check, ThumbsUp, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverName: string;
  vehicleNumber?: string;
  onSubmitRating: (stars: number, compliments: string[], review: string) => void;
}

const COMPLIMENT_TAGS = [
  'Polite Captain',
  'Clean Vehicle',
  'Smooth Electric Ride',
  'On-Time Pickup',
  'Safe Driving',
  'Great Navigation'
];

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  driverName,
  vehicleNumber,
  onSubmitRating
}) => {
  const [stars, setStars] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Polite Captain', 'Smooth Electric Ride']);
  const [review, setReview] = useState('');
  const [hoverStar, setHoverStar] = useState(0);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = () => {
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    onSubmitRating(stars, selectedTags, review);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden border border-neutral-200 p-5 space-y-4">
        {/* Top Close */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-[#E07A00] uppercase tracking-wider bg-[#FFF3C4] px-2 py-0.5 rounded-md">
            Trip Completed
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Captain Info */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 rounded-full bg-[#FFF3C4] text-[#8C5200] font-black text-xl flex items-center justify-center mx-auto shadow-sm">
            {driverName.charAt(0)}
          </div>
          <h3 className="font-extrabold text-base text-neutral-900">
            How was your ride with {driverName}?
          </h3>
          <p className="text-xs text-neutral-400 font-mono">{vehicleNumber || 'WB E-Rickshaw'}</p>
        </div>

        {/* 5-Star Interactive Rating */}
        <div className="flex justify-center gap-2 py-1">
          {[1, 2, 3, 4, 5].map((idx) => {
            const isFilled = (hoverStar || stars) >= idx;
            return (
              <button
                key={idx}
                type="button"
                onMouseEnter={() => setHoverStar(idx)}
                onMouseLeave={() => setHoverStar(0)}
                onClick={() => setStars(idx)}
                className="p-1 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              >
                <Star
                  className={`w-7 h-7 ${
                    isFilled
                      ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                      : 'text-neutral-300'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Compliment Tags */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            Add Compliments
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COMPLIMENT_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#E07A00] text-white'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Written Review */}
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            Written Feedback (Optional)
          </label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={2}
            placeholder="Share any special feedback for your driver..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-3 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-[#E07A00]"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className="w-full bg-[#E07A00] hover:bg-[#C96E00] active:scale-[0.99] text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-colors cursor-pointer"
        >
          <ThumbsUp className="w-4 h-4" />
          <span>Submit Rating</span>
        </button>
      </div>
    </div>
  );
};
