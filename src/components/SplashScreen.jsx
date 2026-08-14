import React, { useEffect, useState } from 'react';
import vobiLogoLight from '../assets/vobi-logo.png';

export default function SplashScreen({ onFinish }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // 0.0s - 1.5s: V is drawn like a heartbeat
    // 1.2s: 'o' slides out
    // 1.4s: 'b' slides out
    // 1.6s: 'i' slides out
    // 2.8s: fade out to Auth page
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 700);
    }, 3200);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <>
      <style>
        {`
          .anim-draw-v {
            stroke-dasharray: 260;
            stroke-dashoffset: 260;
            animation: drawV 1.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
          
          @keyframes drawV {
            0% { stroke-dashoffset: 260; filter: drop-shadow(0 0 0px rgba(56,189,248,0)); }
            50% { filter: drop-shadow(0 0 15px rgba(56,189,248,0.6)); }
            100% { stroke-dashoffset: 0; filter: drop-shadow(0 0 25px rgba(45,212,191,0.8)); }
          }
          
          .anim-slide-o {
            opacity: 0;
            transform: translateX(-40px);
            animation: slideText 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 1.2s forwards;
          }
          
          .anim-slide-b {
            opacity: 0;
            transform: translateX(-40px);
            animation: slideText 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 1.4s forwards;
          }
          
          .anim-slide-i {
            opacity: 0;
            transform: translateX(-40px);
            animation: slideText 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 1.6s forwards;
          }
          
          @keyframes slideText {
            0% { opacity: 0; transform: translateX(-40px); }
            100% { opacity: 1; transform: translateX(0); }
          }
          
          .glow-container {
            animation: pulseGlow 2s infinite alternate 1.5s;
          }
          
          @keyframes pulseGlow {
            from { filter: drop-shadow(0 0 10px rgba(56,189,248,0.2)); }
            to { filter: drop-shadow(0 0 25px rgba(45,212,191,0.6)); }
          }
        `}
      </style>
      
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f1c] text-white transition-opacity duration-700 ease-in-out ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        {/* Deep background ambient glows */}
        <div className="absolute w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Preload Auth Logo */}
        <img src={vobiLogoLight} alt="preload" className="hidden" aria-hidden="true" />

        <div className="relative flex items-end h-24 md:h-32 glow-container">
          
          {/* Animated Heartbeat V */}
          <div className="h-full w-24 md:w-32 shrink-0 z-40 relative">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" fill="none">
              <defs>
                <linearGradient id="v-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />   {/* blue-400 */}
                  <stop offset="50%" stopColor="#818cf8" />  {/* indigo-400 */}
                  <stop offset="100%" stopColor="#2dd4bf" /> {/* teal-400 */}
                </linearGradient>
              </defs>
              <path
                d="M 20 30 L 45 80 L 55 55 L 62 20 L 72 90 L 78 55 L 85 30"
                stroke="url(#v-gradient)"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="anim-draw-v"
              />
            </svg>
          </div>
          
          {/* Cascading Letters */}
          <div className="flex items-baseline text-6xl md:text-[5rem] font-bold tracking-tighter pb-3 md:pb-4 -ml-2 z-30">
            <span className="anim-slide-o bg-clip-text text-transparent bg-gradient-to-br from-blue-400 to-indigo-400 inline-block">
              o
            </span>
            <span className="anim-slide-b bg-clip-text text-transparent bg-gradient-to-br from-indigo-400 to-teal-400 inline-block -ml-1">
              b
            </span>
            <span className="anim-slide-i bg-clip-text text-transparent bg-gradient-to-br from-teal-400 to-teal-300 inline-block ml-1">
              i
            </span>
          </div>

        </div>
      </div>
    </>
  );
}
