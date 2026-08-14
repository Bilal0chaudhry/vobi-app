import React, { useEffect, useState } from 'react';
import vobiLogoLight from '../assets/vobi-logo.png';

export default function SplashScreen({ onFinish }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Total animation time is around 2 seconds. Trigger fade out at 2.4s.
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 700); // 700ms smooth fade out transition
    }, 2400);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <>
      <style>
        {`
          .v-path-anim {
            stroke-dasharray: 140;
            stroke-dashoffset: 140;
            animation: drawV 1.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          }
          
          @keyframes drawV {
            0% {
              stroke-dashoffset: 140;
            }
            100% {
              stroke-dashoffset: 0;
            }
          }
          
          .v-glow {
            animation: glowPulse 2s ease-in-out infinite alternate 0.5s;
          }
          
          @keyframes glowPulse {
            0% {
              filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.3));
            }
            100% {
              filter: drop-shadow(0 0 40px rgba(45, 212, 191, 0.8));
            }
          }
        `}
      </style>
      
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f1c] text-white transition-opacity duration-700 ease-in-out ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        {/* Deep, premium background ambient glows */}
        <div className="absolute w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Hidden preloader for Auth logo to prevent popping */}
        <img src={vobiLogoLight} alt="preload" className="hidden" aria-hidden="true" />

        {/* The Animated "V" Logo */}
        <div className="relative flex items-center justify-center w-32 h-32 md:w-48 md:h-48 v-glow">
          <svg 
            viewBox="0 0 100 100" 
            className="w-full h-full overflow-visible"
            fill="none"
          >
            <defs>
              {/* Vibrant tech gradient matching the Auth page */}
              <linearGradient id="v-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />   {/* blue-400 */}
                <stop offset="50%" stopColor="#818cf8" />  {/* indigo-400 */}
                <stop offset="100%" stopColor="#2dd4bf" /> {/* teal-400 */}
              </linearGradient>
            </defs>

            {/* The single continuous V stroke */}
            <path
              d="M 20 20 L 50 80 L 80 20"
              stroke="url(#v-gradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="v-path-anim"
            />
          </svg>
        </div>
      </div>
    </>
  );
}
