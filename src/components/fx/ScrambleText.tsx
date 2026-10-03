import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const NOISE = '01<>[]{}/\\|$%#&*+=?!';

interface ScrambleTextProps {
  text: string;
  /** ms for the whole string to resolve */
  duration?: number;
  className?: string;
}

// Text that starts as noise and locks in left to right.
const ScrambleText = ({ text, duration = 450, className }: ScrambleTextProps) => {
  const [out, setOut] = useState(text);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      setOut(text);
      return;
    }
    const start = performance.now();
    const id = setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / duration);
      const locked = Math.floor(p * text.length);
      setOut(
        [...text]
          .map((c, i) => (i < locked || c === ' ' ? c : NOISE[Math.floor(Math.random() * NOISE.length)]))
          .join(''),
      );
      if (p >= 1) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [text, duration, reduceMotion]);

  return <span className={className}>{out}</span>;
};

export default ScrambleText;
