import React, { useEffect, useState } from 'react';
import VobiLogo from './VobiLogo';

export default function SplashScreen({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setFadeOut(true);
          setTimeout(onFinish, 400);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 22) + 14;
        return next > 100 ? 100 : next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white transition-opacity duration-500 ${
      fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
    }`}>
      <div className="absolute w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <div className="mb-2 px-8 py-5 rounded-3xl bg-white shadow-2xl shadow-indigo-500/20 border border-slate-200 transform hover:scale-105 transition-transform duration-300">
          <VobiLogo size="xl" />
        </div>

        <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-4">
          Autonomous VOB Agent
        </p>

        <div className="flex items-center gap-1.5 h-6 mb-8 mt-2">
          {[40, 80, 100, 60, 95, 50, 85, 45, 70, 90].map((h, i) => (
            <span
              key={i}
              className="w-1 bg-gradient-to-t from-cyan-400 to-indigo-400 rounded-full animate-pulse"
              style={{
                height: `${h}%`,
                animationDelay: `${i * 100}ms`,
                animationDuration: '750ms',
              }}
            />
          ))}
        </div>

        <div className="w-72 bg-slate-900 border border-slate-800/80 rounded-full h-2.5 p-0.5 mb-3 overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-200 ease-out shadow-md shadow-cyan-500/50"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs font-mono text-slate-400 tracking-wider uppercase">
          {progress < 100 ? `Initializing VOBI Voice Agent... ${progress}%` : 'Agent Ready'}
        </p>
      </div>
    </div>
  );
}
