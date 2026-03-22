'use client';

import { useEffect, useState } from 'react';

interface RouteCalculationLoaderProps {
  isVisible: boolean;
}

export function RouteCalculationLoader({ isVisible }: RouteCalculationLoaderProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="relative flex flex-col items-center gap-6">
        {/* Animated route path visualization */}
        <div className="relative w-32 h-20">
          {/* Route path SVG */}
          <svg
            className="w-full h-full"
            viewBox="0 0 128 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Route path with gradient */}
            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Animated dashed path */}
            <path
              d="M16 60 Q 32 20, 64 40 T 112 30"
              stroke="url(#routeGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="8 4"
              className="animate-dash"
              filter="url(#glow)"
            />

            {/* Start point marker */}
            <circle cx="16" cy="60" r="6" fill="#14b8a6" className="animate-pulse">
              <animate attributeName="r" values="6;8;6" dur="1.5s" repeatCount="indefinite" />
            </circle>

            {/* Destination point marker */}
            <circle cx="112" cy="30" r="6" fill="#0ea5e9" className="animate-pulse">
              <animate attributeName="r" values="6;8;6" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
            </circle>

            {/* Animated traveling dot */}
            <circle r="4" fill="#ffffff" filter="url(#glow)">
              <animateMotion
                dur="2s"
                repeatCount="indefinite"
                path="M16 60 Q 32 20, 64 40 T 112 30"
              />
            </circle>
          </svg>
        </div>

        {/* Loading text */}
        <div className="glass-dark rounded-2xl px-8 py-4 shadow-xl border border-teal-500/20">
          <div className="flex items-center gap-3">
            {/* Animated dots indicator */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-gradient-to-t from-teal-500 to-cyan-500"
                  style={{
                    animation: `bounce-dot 0.6s ease-in-out ${i * 0.15}s infinite alternate`,
                  }}
                />
              ))}
            </div>

            {/* Text */}
            <div className="text-center">
              <p className="text-base font-semibold bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Calculando ruta óptima{dots}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Optimizando orden de entregas
              </p>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500/20 to-transparent blur-sm animate-float" />
        <div className="absolute -bottom-2 -right-4 w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-transparent blur-sm animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <style jsx>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -24;
          }
        }
        .animate-dash {
          animation: dash 0.5s linear infinite;
        }
        @keyframes bounce-dot {
          from {
            transform: translateY(0);
            opacity: 0.6;
          }
          to {
            transform: translateY(-4px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
