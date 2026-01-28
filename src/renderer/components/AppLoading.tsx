import { useEffect, useState } from 'react';
import { LETTER_ANIMATION_DELAY_MS, FOCUS_DELAY_MS } from '../constants';

export function AppLoading() {
  const fullText = 'Neovate';
  const [visibleCount, setVisibleCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isDark] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    if (visibleCount < fullText.length) {
      const timer = setTimeout(() => {
        setVisibleCount((c) => c + 1);
      }, LETTER_ANIMATION_DELAY_MS);
      return () => clearTimeout(timer);
    } else {
      // Trigger completion flourish after last letter
      const timer = setTimeout(() => setIsComplete(true), FOCUS_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [visibleCount]);

  const glowStyle = {
    textShadow: isDark
      ? `0 0 ${isComplete ? 40 : 30}px rgba(255, 255, 255, ${isComplete ? 0.2 : 0.15})`
      : `0 0 ${isComplete ? 30 : 20}px rgba(0, 0, 0, ${isComplete ? 0.15 : 0.1})`,
    transition: 'text-shadow 300ms ease-out',
  };

  return (
    <div
      className={`flex h-screen w-screen flex-col items-center justify-center ${
        isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-white text-neutral-900'
      }`}
    >
      {/* Top drag region for window movement */}
      <div
        className="absolute top-0 left-0 right-0 h-10"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      <div
        className={`text-6xl font-light ${isComplete ? 'animate-flourish' : ''}`}
        style={glowStyle}
      >
        {fullText.split('').map((char, i) => (
          <span
            key={i}
            className={`transition-opacity duration-200 ease-out ${
              i < visibleCount ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {char}
          </span>
        ))}
        <span
          className={`animate-cursor-blink ml-0.5 ${
            visibleCount > 0 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          |
        </span>
      </div>
    </div>
  );
}
