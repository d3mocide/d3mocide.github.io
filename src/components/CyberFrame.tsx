import React from 'react';

interface CyberFrameProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  /** brighter border + corner ticks, used for the focused window */
  active?: boolean;
  /** highlight the border on hover (cards) */
  interactive?: boolean;
}

// Solid, hairline-bordered panel. No blur, near-square corners: the dot world behind
// is the decorative layer, panels stay crisp and readable on top of it.
const CyberFrame = ({ children, className = '', variant = 'primary', active = false, interactive = false }: CyberFrameProps) => {
  const tone = {
    primary: { hover: 'hover:border-neon-green/60', idle: 'border-neon-green/25', on: 'border-neon-green/70', tick: 'border-neon-green' },
    secondary: { hover: 'hover:border-neon-blue/60', idle: 'border-neon-blue/25', on: 'border-neon-blue/70', tick: 'border-neon-blue' },
    danger: { hover: 'hover:border-neon-red/60', idle: 'border-neon-red/25', on: 'border-neon-red/70', tick: 'border-neon-red' },
  }[variant];

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative z-10 bg-bg-panel border ${active ? tone.on : tone.idle} rounded-[3px] overflow-hidden flex flex-col h-full transition-colors duration-150 ${interactive ? tone.hover : ''} ${
          active ? 'shadow-[0_0_0_1px_rgba(0,255,65,0.08),0_12px_40px_rgba(0,0,0,0.6)]' : 'shadow-[0_8px_30px_rgba(0,0,0,0.5)]'
        }`}
      >
        {children}
      </div>
      {active && (
        <>
          <span aria-hidden className={`pointer-events-none absolute -top-px -left-px z-20 h-2 w-2 border-t-2 border-l-2 ${tone.tick}`} />
          <span aria-hidden className={`pointer-events-none absolute -top-px -right-px z-20 h-2 w-2 border-t-2 border-r-2 ${tone.tick}`} />
          <span aria-hidden className={`pointer-events-none absolute -bottom-px -left-px z-20 h-2 w-2 border-b-2 border-l-2 ${tone.tick}`} />
          <span aria-hidden className={`pointer-events-none absolute -bottom-px -right-px z-20 h-2 w-2 border-b-2 border-r-2 ${tone.tick}`} />
        </>
      )}
    </div>
  );
};

export default CyberFrame;
