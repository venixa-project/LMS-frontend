import React, { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number | string;
  suffix?: string;
}

/** Smoothly animates numeric values using ease-out cubic interpolation on mount and value updates. */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, suffix = '' }) => {
  const numericTarget = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
  const hasDecimal = typeof value === 'string' && String(value).includes('.');
  const [displayVal, setDisplayVal] = useState(0);
  const prevTargetRef = useRef(0);

  useEffect(() => {
    const startVal = prevTargetRef.current;
    prevTargetRef.current = numericTarget;
    const duration = 700;
    let startTime: number | null = null;
    let rafId = 0;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayVal(startVal + (numericTarget - startVal) * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplayVal(numericTarget);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [numericTarget]);

  const formatted = hasDecimal ? displayVal.toFixed(1) : Math.round(displayVal).toLocaleString();
  return (
    <>
      {formatted}
      {suffix}
    </>
  );
};
