'use client';

import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value?: number;
  decimals?: number;
  duration?: number;
  className?: string;
  format?: (value?: number) => string;
}

export default function AnimatedNumber({ 
  value, 
  decimals = 2, 
  duration = 300,
  className = '',
  format
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const animationRef = useRef<number>();

  useEffect(() => {
    // Cancel any ongoing animation
    if (animationRef?.current) {
      cancelAnimationFrame(animationRef?.current);
    }

    const startValue = previousValue?.current;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      // Ease-out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (endValue - startValue) * easeProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    animate();

    return () => {
      if (animationRef?.current) {
        cancelAnimationFrame(animationRef?.current);
      }
    };
  }, [value, duration]);

  const formattedValue = format 
    ? format(displayValue) 
    : displayValue.toFixed(decimals);

  return (
    <span className={`transition-number ${className}`}>
      {formattedValue}
    </span>
  );
}