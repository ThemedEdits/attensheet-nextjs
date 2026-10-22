"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface AnimatedCounterProps {
  value: number;
  duration?: number; // In seconds, default 1.2
  decimals?: number; // Number of decimal places
  prefix?: string;
  suffix?: string;
  className?: string;
  formatter?: (val: number) => string;
}

// Cubic ease-out: starts with lively speed and settles gracefully
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function AnimatedCounter({
  value,
  duration = 1.2,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
  formatter,
}: AnimatedCounterProps) {
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(0);
  const startValueRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayValue(value);
      startValueRef.current = value;
      return;
    }

    const startVal = startValueRef.current;
    const endVal = value;
    const durationMs = Math.max(300, duration * 1000);
    startTimeRef.current = null;

    const step = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      const easedProgress = easeOutCubic(progress);

      const current = startVal + (endVal - startVal) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
        startValueRef.current = endVal;
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [value, duration, prefersReducedMotion]);

  const formatted = formatter
    ? formatter(displayValue)
    : decimals > 0
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue).toString();

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export interface AnimatedBarProps {
  width: number | string;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  duration?: number;
  title?: string;
}

export function AnimatedBar({
  width,
  className = "",
  style = {},
  delay = 0,
  duration = 1.0,
  title,
}: AnimatedBarProps) {
  const numericWidth = typeof width === "number" ? `${Math.min(100, Math.max(0, width))}%` : width;
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ width: prefersReducedMotion ? numericWidth : 0 }}
      animate={{ width: numericWidth }}
      transition={{
        duration: prefersReducedMotion ? 0 : duration,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.16, 1, 0.3, 1], // Smooth Apple/Stripe-like curve
      }}
      className={className}
      style={style}
      title={title}
    />
  );
}

export interface AnimatedDonutRingProps {
  cx: number;
  cy: number;
  r: number;
  strokeWidth: number;
  percentage: number;
  stroke: string;
  className?: string;
  duration?: number;
}

export function AnimatedDonutRing({
  cx,
  cy,
  r,
  strokeWidth,
  percentage,
  stroke,
  className = "",
  duration = 1.2,
}: AnimatedDonutRingProps) {
  const prefersReducedMotion = useReducedMotion();
  const circumference = 2 * Math.PI * r;
  const clampedPct = Math.min(100, Math.max(0, percentage));
  const targetOffset = circumference - (clampedPct / 100) * circumference;

  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={r}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={circumference}
      initial={{ strokeDashoffset: prefersReducedMotion ? targetOffset : circumference }}
      animate={{ strokeDashoffset: targetOffset }}
      transition={{
        duration: prefersReducedMotion ? 0 : duration,
        ease: [0.16, 1, 0.3, 1],
      }}
      strokeLinecap="round"
      fill="transparent"
      className={className}
    />
  );
}
