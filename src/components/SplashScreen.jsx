import React, { useEffect, useState } from 'react';
import vobiLogoLight from '../assets/vobi-logo.png';

export default function SplashScreen({ isReady = true, onFinish }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [timePassed, setTimePassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimePassed(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (timePassed && isReady) {
      setFadeOut(true);
      const finishTimer = setTimeout(onFinish, 700);
      return () => clearTimeout(finishTimer);
    }
  }, [timePassed, isReady, onFinish]);

  return (
    <>
      <style>
        {`
          .anim-heartbeat-line {
            stroke-dasharray: 700;
            stroke-dashoffset: 700;
            animation: drawHeartbeat 2.5s linear infinite;
          }
          
          @keyframes drawHeartbeat {
            0% { 
              stroke-dashoffset: 700; 
              opacity: 0;
            }
            10% { 
              opacity: 1; 
              filter: drop-shadow(0 0 15px rgba(56,189,248,0.6));
            }
            90% { 
              opacity: 1; 
              filter: drop-shadow(0 0 15px rgba(56,189,248,0.6));
            }
            100% { 
              stroke-dashoffset: 0; 
              opacity: 0;
            }
          }
          
          .glow-container {
            animation: pulseGlow 2.5s ease-in-out infinite alternate;
          }
          
          @keyframes pulseGlow {
            from { filter: drop-shadow(0 0 10px rgba(56,189,248,0.1)); }
            to { filter: drop-shadow(0 0 35px rgba(45,212,191,0.5)); }
          }
        `}
      </style>
      
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f1c] text-white transition-opacity duration-700 ease-in-out ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="absolute w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

        <img src={vobiLogoLight} alt="preload" className="hidden" aria-hidden="true" />

        <div className="relative flex flex-col items-center justify-center w-full max-w-lg px-8 glow-container">
          
          <div className="w-full h-32 md:h-40 z-40 relative">
            <svg viewBox="0 0 400 100" className="w-full h-full overflow-visible" fill="none">
              <defs>
                <linearGradient id="v-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                </linearGradient>
              </defs>
              <path
                d="M 0 50 L 50 50 L 60 20 L 70 80 L 80 50 L 150 50 L 160 35 L 170 65 L 180 50 L 250 50 L 260 10 L 275 90 L 290 50 L 400 50"
                stroke="url(#v-gradient)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="anim-heartbeat-line"
              />
            </svg>
          </div>
          
          <p className="text-[10px] uppercase tracking-[0.3em] font-semibold text-slate-500 mt-2 animate-pulse">
            Connecting...
          </p>

        </div>
      </div>
    </>
  );
}
