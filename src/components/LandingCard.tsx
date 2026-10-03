import { useState, useEffect } from 'react';
import { useOSStore } from '@/store/useOSStore';
import { useSoundFX } from '@/hooks/useSoundFX';
import { useChromaticClick } from '@/hooks/useChromaticClick';
import ScrambleText from '@/components/fx/ScrambleText';
import { Spinner } from '@/components/ascii/primitives';

type Phase = 'power-on' | 'post' | 'warping';

interface BootRow {
  label: string;
  value: string;
  color?: 'green' | 'white';
}

const BOOT_ROWS: BootRow[] = [
  { label: 'BIOS', value: 'd3FRAG v3.0.4' },
  { label: 'MEMORY_TEST', value: 'OK', color: 'green' },
  { label: 'NETWORK_IF', value: 'OK', color: 'green' },
  { label: 'KERNEL_MODULES', value: 'OK', color: 'green' },
  { label: 'STATUS_CODE', value: '0x000200', color: 'green' },
  { label: 'PATH', value: 'd3frag.net/root', color: 'white' },
  { label: 'TIMESTAMP', value: new Date().toLocaleTimeString(), color: 'white' },
];

const LINE_INTERVAL = 140; // ms between each boot row appearing
const POST_HOLD = 550; // ms to hold once all rows are shown before auto-continuing

const LandingCard = () => {
  const { setBooting } = useOSStore();
  const [phase, setPhase] = useState<Phase>('power-on');
  const [visibleRows, setVisibleRows] = useState(0);
  const { playClick, playKeystroke } = useSoundFX();
  const { chromaticClass, triggerGlitch } = useChromaticClick();

  const handlePowerOn = (e: React.MouseEvent) => {
    e.preventDefault();
    playClick();
    setPhase('post');
  };

  // Reveal boot rows one at a time
  useEffect(() => {
    if (phase !== 'post' || visibleRows >= BOOT_ROWS.length) return;
    const t = setTimeout(() => {
      playKeystroke();
      setVisibleRows((n) => n + 1);
    }, LINE_INTERVAL);
    return () => clearTimeout(t);
  }, [phase, visibleRows, playKeystroke]);

  // Once fully booted, hold briefly then auto-continue into the desktop
  useEffect(() => {
    if (phase !== 'post' || visibleRows < BOOT_ROWS.length) return;
    const t = setTimeout(() => {
      setPhase('warping');
      playClick();
      triggerGlitch();
      setTimeout(() => setBooting(false), 500);
    }, POST_HOLD);
    return () => clearTimeout(t);
  }, [phase, visibleRows, playClick, triggerGlitch, setBooting]);

  return (
    <div className={`relative z-20 w-full max-w-3xl mx-auto flex flex-col items-center transition-all duration-1000 ${phase === 'warping' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>

      {/* Title-screen panel */}
      <div className="bg-black/70 border border-neon-green/25 rounded-[3px] p-8 md:p-12 w-full flex flex-col items-center relative">

        {/* Box-drawing title tab sitting on the top border */}
        <div aria-hidden className="absolute -top-2.5 left-6 bg-bg-void px-2 font-mono text-[11px] tracking-widest text-neon-green/70">┤ d3_OS // BOOT ├</div>
        <div aria-hidden className="absolute -bottom-2.5 right-6 bg-bg-void px-2 font-mono text-[11px] tracking-widest text-gray-600">┤ v3.0.4 ├</div>

        {/* Status chip */}
        <div className="relative z-40 mb-8">
            <div className="inline-flex items-center space-x-2 border border-neon-green/40 rounded-[3px] px-3 py-1 font-mono text-[10px] tracking-[0.25em] uppercase text-neon-green">
                <span aria-hidden className="animate-pulse">●</span>
                <ScrambleText key={phase} text={phase === 'power-on' ? 'SYSTEM STANDBY' : 'SYSTEM ONLINE'} />
            </div>
        </div>

        {/* Spacer for the Logo (Logo is sandwiched at Z-30 from App.tsx) */}
        <div className="w-full h-[270px] pointer-events-none" />

        {/*
          Fixed-height zone below the logo spacer, so the card's total height
          (and therefore where its vertically-centered top edge lands relative
          to the independently-positioned logo above) stays the same whether
          we're showing the power-on button or the boot rows filling in one
          by one. Without this the card resizes across phases/rows and the
          logo drifts out of alignment with the spacer built for it.
        */}
        <div className="min-h-[280px] w-full flex flex-col items-center justify-center relative z-10">
        {phase === 'power-on' ? (
          <button
            onClick={handlePowerOn}
            className={`group/btn inline-flex items-center justify-center px-4 sm:px-8 py-3.5 font-mono text-sm text-neon-green border border-neon-green/60 rounded-[3px] transition-colors duration-150 hover:bg-neon-green hover:text-black ${chromaticClass}`}
          >
              <span className="tracking-[0.1em] sm:tracking-[0.25em] whitespace-nowrap">[ INITIALIZE SYSTEM ]</span>
              <span aria-hidden className="ml-3 w-2 h-4 bg-current animate-pulse" />
          </button>
        ) : (
          <div className="w-full relative z-40 max-w-sm mx-auto text-left text-xs font-mono">
            {BOOT_ROWS.slice(0, visibleRows).map((row) => (
                <div key={row.label} className="flex items-baseline gap-2 py-0.5">
                    <span className={row.color === 'green' ? 'text-neon-green' : 'text-gray-600'}>{row.color === 'green' ? '[ OK ]' : '[ -- ]'}</span>
                    <span className="text-gray-500">{row.label}</span>
                    <span aria-hidden className="flex-1 border-b border-dotted border-white/15 translate-y-[-3px]" />
                    <ScrambleText className={row.color === 'green' ? 'text-neon-green' : 'text-white'} text={row.value} duration={320} />
                </div>
            ))}

            <p className={`mt-6 text-center text-xs tracking-[0.3em] uppercase transition-opacity duration-300 ${visibleRows >= BOOT_ROWS.length ? 'text-neon-green opacity-100' : 'opacity-0'}`}>
                <Spinner /> Starting Desktop Shell<span className="animate-pulse">_</span>
            </p>
          </div>
        )}
        </div>

      </div>
    </div>
  );
};

export default LandingCard;
