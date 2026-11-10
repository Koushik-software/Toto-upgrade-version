import React from 'react';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  iconClassName?: string;
  iconStyle?: React.CSSProperties;
}

export const AppLogo: React.FC<AppLogoProps> = ({ 
  size = 'md', 
  showText = false,
  className = '',
  iconClassName = '',
  iconStyle,
}) => {
  const sizeMap = {
    xs: { icon: 'w-6 h-6', text: 'text-xs', sub: 'text-[9px]' },
    sm: { icon: 'w-8 h-8', text: 'text-sm', sub: 'text-[10px]' },
    md: { icon: 'w-11 h-11', text: 'text-base', sub: 'text-xs' },
    lg: { icon: 'w-16 h-16', text: 'text-xl', sub: 'text-sm' },
    xl: { icon: 'w-24 h-24', text: 'text-2xl', sub: 'text-base' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon: Yellow rounded squircle with black-ink electric Toto & lightning bolt */}
      <div 
        className={`${currentSize.icon} relative rounded-[28%] bg-[#FFD500] shadow-sm flex items-center justify-center overflow-hidden border border-black/10 shrink-0 transition-transform hover:scale-105 ${iconClassName}`}
        style={{
          boxShadow: '0 3px 8px -2px rgba(234, 179, 8, 0.4), 0 1px 3px rgba(0, 0, 0, 0.1)',
          ...iconStyle,
        }}
      >
        <svg 
          viewBox="0 0 100 100" 
          className="w-[82%] h-[82%]"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ground Curve */}
          <path 
            d="M18 76C30 73 70 73 84 76" 
            stroke="#121212" 
            strokeWidth="3" 
            strokeLinecap="round" 
          />
          {/* Motion Dash Lines */}
          <line x1="72" y1="52" x2="84" y2="52" stroke="#121212" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="75" y1="58" x2="88" y2="58" stroke="#121212" strokeWidth="2" strokeLinecap="round" />

          {/* Front Wheel */}
          <circle cx="31" cy="65" r="7" fill="#121212" />
          <circle cx="31" cy="65" r="3" fill="#FFD500" />

          {/* Rear Wheel */}
          <circle cx="64" cy="65" r="7" fill="#121212" />
          <circle cx="64" cy="65" r="3" fill="#FFD500" />

          {/* Toto Cabin Body */}
          <path 
            d="M33 60H65C68 60 70 58 70 54V40C70 36 67 33 62 33H44C38 33 33 37 31 43L28 52C27 55 29 60 33 60Z" 
            fill="#121212" 
          />

          {/* Windshield */}
          <path 
            d="M33 44L36 36H43V48H32L33 44Z" 
            fill="#FFD500" 
            stroke="#121212" 
            strokeWidth="2" 
          />

          {/* Passenger Cabin Opening */}
          <rect x="46" y="37" width="16" height="17" rx="3" fill="#FFD500" />

          {/* Driver Silhouette */}
          <circle cx="43" cy="43" r="3.2" fill="#121212" />
          <path d="M41 47H46L48 55H42L41 47Z" fill="#121212" />
          <path d="M39 50L35 52" stroke="#121212" strokeWidth="2" strokeLinecap="round" />

          {/* Prominent Lightning Bolt on Rear Roof/Body */}
          <path 
            d="M66 22L53 43H62L58 56L75 35H64L69 22H66Z" 
            fill="#121212" 
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-neutral-900 ${currentSize.text}`}>
              Toto<span className="text-[#E07A00]">Drive</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-[#FFF3C4] text-[#8C5200] font-black text-[9px] uppercase tracking-wider border border-[#FFE082]">
              Eco
            </span>
          </div>
          <span className={`text-neutral-500 font-medium ${currentSize.sub}`}>
            Electric E-Rickshaw Network
          </span>
        </div>
      )}
    </div>
  );
};
