
"use client";

import { useState, useEffect } from 'react';

const typingText = "Seja bem Vindo";
const staticText = "ao GrafosMap";

export function AnimatedWelcome() {
  const [displayedText, setDisplayedText] = useState('');
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (charIndex < typingText.length) {
      const timeoutId = setTimeout(() => {
        setDisplayedText(typingText.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, 120); // Typing speed
      return () => clearTimeout(timeoutId);
    }
  }, [charIndex]);

  return (
    <div className="text-center select-none">
      <h1 className="text-5xl sm:text-6xl md:text-7xl font-headline mb-2">
        <span className="text-primary drop-shadow-[0_0_10px_hsl(var(--primary))]">{displayedText}</span>
        {charIndex < typingText.length && <span className="animate-pulse text-primary opacity-75">|</span>}
      </h1>
      <p className="text-3xl sm:text-4xl md:text-5xl font-headline text-foreground/90">
        {staticText}
      </p>
    </div>
  );
}
