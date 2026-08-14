import React, { useEffect, useState } from 'react';
import vobiV from '../assets/vobi_V.png';
import vobio from '../assets/vobi_o.png';
import vobib from '../assets/vobi_b.png';
import vobii from '../assets/vobi_i.png';

export default function SplashScreen({ onFinish }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Sequence: 
    // 0.0s - 1.0s: V fades in and heartbeats
    // 1.0s - 1.3s: o slides out
    // 1.2s - 1.5s: b slides out
    // 1.4s - 1.7s: i slides out
    // 2.7s: fade out starts
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 700);
    }, 2800);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <>
      <style>
        {`
          .anim-heartbeat {
            opacity: 0;
            animation: 
              fadeIn 0.5s ease-out forwards,
              heartbeat 1s ease-in-out 0.5s forwards;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
          
          @keyframes heartbeat {
            0% { transform: scale(1); }
            15% { transform: scale(1.08); filter: drop-shadow(0 0 15px rgba(56, 189, 248, 0.6)); }
            30% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(56, 189, 248, 0)); }
            45% { transform: scale(1.08); filter: drop-shadow(0 0 25px rgba(56, 189, 248, 0.8)); }
            100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.3)); }
          }
          
          .anim-slide-o {
            opacity: 0;
            transform: translateX(-150px);
            animation: slideOut 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 1.2s forwards;
          }
          
          .anim-slide-b {
            opacity: 0;
            transform: translateX(-150px);
            animation: slideOut 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 1.4s forwards;
          }
          
          .anim-slide-i {
            opacity: 0;
            transform: translateX(-100px);
            animation: slideOut 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 1.6s forwards;
          }
          
          @keyframes slideOut {
            0% { opacity: 0; transform: translateX(-150px); }
            50% { opacity: 1; }
            100% { opacity: 1; transform: translateX(0); }
          }
        `}
      </style>
      
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f1c] transition-opacity duration-700 ease-in-out ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="absolute w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative flex items-center h-16 sm:h-20 md:h-28">
          <img src={vobiV} className="h-full object-contain relative z-40 anim-heartbeat" alt="V" />
          <img src={vobio} className="h-full object-contain relative z-30 anim-slide-o ml-[2%]" alt="o" />
          <img src={vobib} className="h-full object-contain relative z-20 anim-slide-b -ml-[1%]" alt="b" />
          <img src={vobii} className="h-full object-contain relative z-10 anim-slide-i ml-[1.5%]" alt="i" />
        </div>
      </div>
    </>
  );
}
