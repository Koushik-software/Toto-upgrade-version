import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  isAuthenticated?: boolean;
  hasLocationPermission?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'drawing' | 'glowing' | 'wave' | 'dissolve'>('drawing');
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    // 0–300 ms: Vector stroke drawing
    // 300–500 ms: Glowing neon intensity & traveling light pulse
    const timerGlow = setTimeout(() => {
      setPhase('glowing');
    }, 300);

    // 500–700 ms: Circular energy wave expands outward
    const timerWave = setTimeout(() => {
      setPhase('wave');
    }, 500);

    // 700–800 ms: Dissolve transition
    const timerDissolve = setTimeout(() => {
      setPhase('dissolve');
    }, 700);

    // 850 ms: Complete transition into main app
    const timerDone = setTimeout(() => {
      setIsCompleted(true);
      onComplete();
    }, 850);

    return () => {
      clearTimeout(timerGlow);
      clearTimeout(timerWave);
      clearTimeout(timerDissolve);
      clearTimeout(timerDone);
    };
  }, [onComplete]);

  if (isCompleted) return null;

  return (
    <div 
      id="neon-splash-root"
      className={`fixed inset-0 z-50 bg-[#FAF8F5] flex items-center justify-center select-none overflow-hidden transition-all duration-300 ${
        phase === 'dissolve' ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        // Premium luminous light backdrop matching the app theme
        background: 'radial-gradient(circle at 50% 50%, #FFFFFF 0%, #FAF8F5 55%, #F0EDE6 100%)',
      }}
    >
      <style>{`
        @keyframes strokeDraw {
          0% {
            stroke-dashoffset: 360;
            opacity: 0.15;
          }
          60% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes pulseTravel {
          0% {
            stroke-dashoffset: 360;
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0;
          }
        }

        @keyframes energyWaveExpand {
          0% {
            transform: translate(-50%, -50%) scale(0.65);
            opacity: 0.9;
            border-width: 2.5px;
          }
          40% {
            opacity: 0.7;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.6);
            opacity: 0;
            border-width: 1px;
          }
        }

        @keyframes particleFloat {
          0% {
            transform: translateY(0px) scale(0.8);
            opacity: 0;
          }
          30% {
            opacity: 0.7;
          }
          70% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-48px) scale(1.2);
            opacity: 0;
          }
        }

        @keyframes volumetricBreathe {
          0% {
            opacity: 0.35;
            transform: translate(-50%, -50%) scale(0.9);
          }
          50% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1.1);
          }
          100% {
            opacity: 0.3;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }

        .neon-draw-path {
          stroke-dasharray: 360;
          animation: strokeDraw 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .neon-pulse-ring {
          stroke-dasharray: 60 300;
          animation: pulseTravel 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .energy-wave-anim {
          animation: energyWaveExpand 220ms cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
      `}</style>

      {/* Modern Smartphone Presentation Wrapper - Light Mode Frame */}
      <div className="relative w-full h-full sm:h-[844px] sm:max-w-[390px] sm:rounded-[52px] sm:border-[5px] sm:border-[#EDE8E0] sm:shadow-[0_25px_70px_-15px_rgba(255,213,0,0.3),0_12px_32px_rgba(0,0,0,0.06)] overflow-hidden bg-[#FAF8F5] flex items-center justify-center">
        
        {/* Subtle Smartphone Device Reflections & Highlights (Desktop frame) */}
        <div className="hidden sm:block absolute inset-0 rounded-[48px] pointer-events-none ring-1 ring-black/5 z-30" />
        <div 
          className="hidden sm:block absolute -top-[40%] -left-[40%] w-[180%] h-[180%] pointer-events-none z-20 opacity-40"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.15) 28%, transparent 50%)'
          }}
        />

        {/* Smartphone Speaker / Dynamic Island Top Notch Simulation (Desktop frame) */}
        <div className="hidden sm:flex absolute top-3.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-[#121212] rounded-full z-30 items-center justify-center border border-black/10 shadow-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1E1E1E] border border-white/20 mr-2" />
          <div className="w-10 h-1 bg-[#2C2C2C] rounded-full" />
        </div>

        {/* Ambient Volumetric Radial Warm Golden Illumination Behind Logo */}
        <div 
          className="absolute top-1/2 left-1/2 w-[340px] h-[340px] rounded-full pointer-events-none z-0 filter blur-[40px] transition-opacity duration-300"
          style={{
            background: 'radial-gradient(circle, rgba(255, 213, 0, 0.35) 0%, rgba(224, 122, 0, 0.18) 45%, rgba(250, 248, 245, 0) 70%)',
            animation: 'volumetricBreathe 800ms ease-in-out infinite alternate',
            opacity: phase === 'glowing' ? 0.8 : phase === 'wave' ? 0.55 : 0.4,
          }}
        />

        {/* Soft Secondary Warm Radial Glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] rounded-full pointer-events-none z-0 filter blur-[24px]"
          style={{
            background: 'radial-gradient(circle, rgba(255, 213, 0, 0.45) 0%, rgba(245, 158, 11, 0.2) 55%, transparent 75%)',
            opacity: phase === 'glowing' ? 0.9 : 0.5,
            transition: 'opacity 200ms ease-out',
          }}
        />

        {/* Floating Ambient Warm Gold Particles */}
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {[
            { top: '42%', left: '38%', delay: '0ms', size: 3 },
            { top: '36%', left: '60%', delay: '120ms', size: 2.5 },
            { top: '64%', left: '34%', delay: '240ms', size: 3 },
            { top: '60%', left: '65%', delay: '80ms', size: 2.5 },
            { top: '46%', left: '72%', delay: '180ms', size: 2 },
            { top: '56%', left: '26%', delay: '300ms', size: 2.5 },
          ].map((p, idx) => (
            <div
              key={idx}
              className="absolute rounded-full bg-[#FFD500] filter blur-[0.5px]"
              style={{
                top: p.top,
                left: p.left,
                width: `${p.size}px`,
                height: `${p.size}px`,
                boxShadow: '0 0 8px #FFD500, 0 0 12px #E07A00',
                animation: `particleFloat 750ms ease-out infinite`,
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>

        {/* Circular Energy Wave in Original Gold/Amber (Fires at 500ms during 'wave' phase) */}
        {(phase === 'wave' || phase === 'dissolve') && (
          <div 
            className="energy-wave-anim absolute top-1/2 left-1/2 rounded-full pointer-events-none z-10 border border-[#FFD500] shadow-[0_0_28px_rgba(255,213,0,0.65),inset_0_0_18px_rgba(224,122,0,0.35)]"
            style={{ width: '140px', height: '140px' }}
          />
        )}

        {/* Center Logo Stage - Symmetrical Composition with Original Logo Colors */}
        <div className="relative z-20 flex items-center justify-center">
          
          {/* Yellow Brand Squircle Badge matching AppLogo (rounded-[28%] bg-[#FFD500]) */}
          <div 
            className={`w-32 h-32 rounded-[28%] bg-[#FFD500] flex items-center justify-center p-3 relative overflow-hidden border border-black/10 transition-all duration-300 ${
              phase === 'glowing' 
                ? 'shadow-[0_16px_48px_rgba(234,179,8,0.55),0_4px_16px_rgba(0,0,0,0.15)] scale-[1.03]' 
                : 'shadow-[0_4px_16px_rgba(234,179,8,0.4),0_1px_4px_rgba(0,0,0,0.1)] scale-100'
            }`}
            style={{
              transition: 'box-shadow 200ms ease-out, transform 200ms ease-out',
            }}
          >
            {/* The Authentic Logo Vector SVG (Exact colors & geometry from AppLogo.tsx) */}
            <svg 
              viewBox="0 0 100 100" 
              className="w-[82%] h-[82%]"
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Traveling Light Pulse Gradient */}
                <linearGradient id="yellowPulseGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                  <stop offset="50%" stopColor="#FFF59D" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#FFD500" stopOpacity="0" />
                </linearGradient>

                {/* Soft Gold Bloom Filter for Stroke Phase */}
                <filter id="goldBloom" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.2" result="glow1" />
                  <feGaussianBlur stdDeviation="3.5" result="glow2" />
                  <feMerge>
                    <feMergeNode in="glow2" />
                    <feMergeNode in="glow1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Squircle Brand Outline & Light Pulse (300-500ms) */}
              {phase === 'glowing' && (
                <rect 
                  x="2" 
                  y="2" 
                  width="96" 
                  height="96" 
                  rx="27" 
                  stroke="url(#yellowPulseGlow)" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                  className="neon-pulse-ring"
                  style={{ filter: 'drop-shadow(0 0 8px #FFFFFF)' }}
                />
              )}

              {/* Ground Curve - stroke #121212 */}
              <path 
                d="M18 76C30 73 70 73 84 76" 
                stroke="#121212" 
                strokeWidth="3" 
                strokeLinecap="round" 
                className="neon-draw-path"
              />

              {/* Motion Dash Lines - stroke #121212 */}
              <line 
                x1="72" 
                y1="52" 
                x2="84" 
                y2="52" 
                stroke="#121212" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                className="neon-draw-path"
              />
              <line 
                x1="75" 
                y1="58" 
                x2="88" 
                y2="58" 
                stroke="#121212" 
                strokeWidth="2" 
                strokeLinecap="round" 
                className="neon-draw-path"
              />

              {/* Front Wheel - outer circle fill #121212, hub fill #FFD500 */}
              <circle 
                cx="31" 
                cy="65" 
                r="7" 
                fill="#121212" 
                stroke="#121212"
                strokeWidth="0.5"
                className="neon-draw-path"
              />
              <circle 
                cx="31" 
                cy="65" 
                r="3" 
                fill="#FFD500" 
                className="neon-draw-path"
              />

              {/* Rear Wheel - outer circle fill #121212, hub fill #FFD500 */}
              <circle 
                cx="64" 
                cy="65" 
                r="7" 
                fill="#121212" 
                stroke="#121212"
                strokeWidth="0.5"
                className="neon-draw-path"
              />
              <circle 
                cx="64" 
                cy="65" 
                r="3" 
                fill="#FFD500" 
                className="neon-draw-path"
              />

              {/* Toto Cabin Body - fill #121212 */}
              <path 
                d="M33 60H65C68 60 70 58 70 54V40C70 36 67 33 62 33H44C38 33 33 37 31 43L28 52C27 55 29 60 33 60Z" 
                fill="#121212" 
                stroke="#121212"
                strokeWidth="0.5"
                className="neon-draw-path"
              />

              {/* Windshield - fill #FFD500, stroke #121212 */}
              <path 
                d="M33 44L36 36H43V48H32L33 44Z" 
                fill="#FFD500" 
                stroke="#121212" 
                strokeWidth="2" 
                className="neon-draw-path"
              />

              {/* Passenger Cabin Opening - fill #FFD500 */}
              <rect 
                x="46" 
                y="37" 
                width="16" 
                height="17" 
                rx="3" 
                fill="#FFD500" 
                className="neon-draw-path"
              />

              {/* Driver Silhouette - fill #121212 */}
              <circle 
                cx="43" 
                cy="43" 
                r="3.2" 
                fill="#121212" 
                className="neon-draw-path"
              />
              <path 
                d="M41 47H46L48 55H42L41 47Z" 
                fill="#121212" 
                className="neon-draw-path"
              />
              <path 
                d="M39 50L35 52" 
                stroke="#121212" 
                strokeWidth="2" 
                strokeLinecap="round" 
                className="neon-draw-path"
              />

              {/* Prominent Lightning Bolt on Rear Roof - fill #121212 */}
              <path 
                d="M66 22L53 43H62L58 56L75 35H64L69 22H66Z" 
                fill="#121212" 
                stroke="#121212"
                strokeWidth="0.5"
                className="neon-draw-path"
              />
            </svg>
          </div>
        </div>

        {/* Subtle Bottom Ambient Warm Floor Reflection */}
        <div 
          className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 h-8 rounded-full pointer-events-none opacity-50 filter blur-lg"
          style={{
            background: 'radial-gradient(ellipse, rgba(255,213,0,0.4) 0%, rgba(224,122,0,0.15) 60%, transparent 80%)'
          }}
        />
      </div>
    </div>
  );
};
