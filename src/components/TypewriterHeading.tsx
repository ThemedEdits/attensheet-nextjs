"use client";

import { useEffect, useState } from "react";

interface TypewriterHeadingProps {
  prefix?: string;
  phrases?: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  emptyPauseDuration?: number;
}

const DEFAULT_PHRASES = [
  "in 30 seconds.",
  "straight from your phone.",
  "synced to Google Sheets.",
  "with zero paper chaos.",
];

export function TypewriterHeading({
  prefix = "Run lecture roll-call ",
  phrases = DEFAULT_PHRASES,
  typingSpeed = 60,
  deletingSpeed = 32,
  pauseDuration = 2200,
  emptyPauseDuration = 350,
}: TypewriterHeadingProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState(phrases[0] || "");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!phrases || phrases.length === 0) return;

    const currentTarget = phrases[phraseIndex % phrases.length];

    if (!isDeleting && displayText === currentTarget) {
      // Pause at full sentence before erasing
      const timer = setTimeout(() => {
        setIsDeleting(true);
      }, pauseDuration);
      return () => clearTimeout(timer);
    }

    if (isDeleting && displayText === "") {
      // Pause briefly at empty before typing next phrase
      const timer = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }, emptyPauseDuration);
      return () => clearTimeout(timer);
    }

    const currentSpeed = isDeleting ? deletingSpeed : typingSpeed;
    const timer = setTimeout(() => {
      setDisplayText((prev) => {
        if (isDeleting) {
          return currentTarget.substring(0, prev.length - 1);
        } else {
          return currentTarget.substring(0, prev.length + 1);
        }
      });
    }, currentSpeed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, phraseIndex, phrases, typingSpeed, deletingSpeed, pauseDuration, emptyPauseDuration]);

  return (
    <>
      {/* Screen-reader accessible full text */}
      <span className="sr-only">
        {prefix} {phrases.join(", ")}
      </span>

      {/* Visual typewriter presentation */}
      <span aria-hidden="true" className="inline">
        <span className="bg-gradient-to-r from-[var(--accent)] via-emerald-400 to-teal-200 bg-clip-text text-transparent">
          {prefix}
          <span>{displayText}</span>
        </span>
        <span
          className="typewriter-cursor inline-block w-[2.5px] sm:w-[3.5px] h-[0.75em] bg-[var(--accent)] ml-1 align-middle rounded-full shadow-[0_0_8px_rgba(53,217,138,0.7)] pointer-events-none"
        />
      </span>
    </>
  );
}
