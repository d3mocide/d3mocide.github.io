import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toneText, type Tone } from './tone';

// Small text-mode building blocks shared by the apps: everything is drawn with real
// characters (box-drawing rules, [brackets], dotted leaders) rather than icons or fills.

const toneBorder: Record<Tone, string> = {
  green: 'border-neon-green/40 hover:bg-neon-green/10',
  blue: 'border-neon-blue/40 hover:bg-neon-blue/10',
  pink: 'border-neon-pink/40 hover:bg-neon-pink/10',
  yellow: 'border-neon-yellow/40 hover:bg-neon-yellow/10',
  red: 'border-neon-red/40 hover:bg-neon-red/10',
  gray: 'border-white/20 hover:bg-white/5',
};

const SPIN = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';

/** Braille spinner. */
export const Spinner = ({ className }: { className?: string }) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % SPIN.length), 80);
    return () => clearInterval(id);
  }, []);
  return (
    <span aria-hidden className={className}>
      {SPIN[i]}
    </span>
  );
};

/** `╞═ LABEL ════════════╡` section divider. */
export const Rule = ({ label, tone = 'green' }: { label: string; tone?: Tone }) => (
  <div className={`flex items-center gap-2 select-none ${toneText[tone]}`} role="separator" aria-label={label}>
    <span aria-hidden>╞═</span>
    <span className="tracking-[0.2em] text-xs font-bold shrink-0">{label}</span>
    <span aria-hidden className="flex-1 overflow-hidden whitespace-nowrap opacity-40">
      {'═'.repeat(160)}
    </span>
    <span aria-hidden>╡</span>
  </div>
);

/** `Label ........ value` row with a dotted leader. */
export const LeaderRow = ({ label, children, tone = 'green' }: { label: string; children: ReactNode; tone?: Tone }) => (
  <div className="flex items-baseline gap-2 text-xs">
    <span className="text-gray-400 shrink-0">{label}</span>
    <span aria-hidden className="flex-1 border-b border-dotted border-white/15 translate-y-[-3px]" />
    <span className={`${toneText[tone]} shrink-0 text-right`}>{children}</span>
  </div>
);

/** `[Label]` chip. */
export const Tag = ({ children, tone = 'blue', color }: { children: ReactNode; tone?: Tone; color?: string }) => (
  <span className={`text-[11px] whitespace-nowrap ${toneText[tone]}`} style={color ? { color } : undefined}>
    [{children}]
  </span>
);

interface TextButtonProps {
  children: ReactNode;
  onClick?: () => void;
  tone?: Tone;
  /** boxed `[ LABEL ]` button with a border, versus an inline `[LABEL]` link */
  boxed?: boolean;
  className?: string;
  slot?: string;
  disabled?: boolean;
}

export const TextButton = ({ children, onClick, tone = 'blue', boxed = false, className = '', slot, disabled }: TextButtonProps) => (
  <button
    type="button"
    slot={slot}
    onClick={onClick}
    disabled={disabled}
    className={
      boxed
        ? `font-mono text-xs font-bold tracking-widest px-3 py-1.5 border rounded-[3px] transition-colors ${toneText[tone]} ${toneBorder[tone]} disabled:opacity-40 ${className}`
        : `font-mono text-[11px] tracking-wider ${toneText[tone]} opacity-70 hover:opacity-100 hover:underline underline-offset-4 transition-opacity ${className}`
    }
  >
    {boxed ? `[ ${children} ]` : <>[{children}]</>}
  </button>
);

/** `[x] Label` / `[ ] Label` checkbox. */
export const Toggle = ({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: ReactNode }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={onChange}
    className="flex items-center gap-2 text-xs text-left hover:bg-neon-green/5 px-1 py-0.5 rounded-[3px] transition-colors"
  >
    <span className={checked ? 'text-neon-green' : 'text-gray-600'}>{checked ? '[x]' : '[ ]'}</span>
    <span className={checked ? 'text-gray-300' : 'text-gray-600 line-through'}>{children}</span>
  </button>
);

/** Text slider: `[██████░░░░░░]`. The bar fills the available width. A transparent native range input sits on top, so it stays draggable and keyboard accessible. */
export const TextSlider = ({
  value,
  onChange,
  disabled,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  label: string;
}) => {
  const box = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(20);

  useEffect(() => {
    const el = box.current;
    const sample = probe.current;
    if (!el || !sample) return;
    const measure = () => {
      const cw = sample.getBoundingClientRect().width || 8.4;
      setWidth(Math.max(8, Math.floor(el.clientWidth / cw) - 2));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filled = Math.round((value / 100) * width);
  return (
    <div ref={box} className={`relative font-mono text-sm select-none overflow-hidden ${disabled ? 'opacity-40' : ''}`}>
      <span ref={probe} aria-hidden className="absolute invisible">█</span>
      <div aria-hidden className="whitespace-pre text-neon-green">
        [<span>{'█'.repeat(filled)}</span>
        <span className="text-gray-700">{'░'.repeat(width - filled)}</span>]
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  );
};
