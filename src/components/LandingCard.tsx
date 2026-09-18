import { useState, useEffect } from 'react';
import { useOSStore } from '@/store/useOSStore';
import { useSoundFX } from '@/hooks/useSoundFX';
import { useChromaticClick } from '@/hooks/useChromaticClick';

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

      {/* Main Glass Card Background & Container */}
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl w-full flex flex-col items-center relative overflow-hidden group">

        {/* Status - High Z to sit over any potential logo overlap */}
        <div className="relative z-40 mb-8">
            <div className="inline-flex items-center space-x-2 bg-black/80 border border-neon-green/30 rounded-full px-4 py-1.5 shadow-[0_0_15px_rgba(0,255,65,0.2)]">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neon-green"></span>
                </span>
                <span className="text-[10px] font-bold text-neon-green font-mono tracking-widest uppercase">
                    {phase === 'power-on' ? 'System Standby' : 'System Online'}
                </span>
            </div>
        </div>

        {/* Spacer for the Logo (Logo is sandwiched at Z-30 from App.tsx) */}
        <div className="w-full h-[220px] pointer-events-none" />

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
          /* Power On Prompt */
          <button
            onClick={handlePowerOn}
            className={`group/btn relative inline-flex items-center justify-center space-x-2 px-8 py-3.5 font-mono text-sm text-neon-green border border-neon-green/40 rounded-lg transition-all duration-200 hover:bg-neon-green/10 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,255,65,0.3)] ${chromaticClass}`}
          >
              <span>&gt;_</span>
              <span className="tracking-widest">INITIALIZE SYSTEM</span>
              <span className="w-2 h-4 bg-neon-green animate-pulse" />
          </button>
        ) : (
          /* Boot Sequence */
          <div className="w-full relative z-40">
            <div className="grid grid-cols-1 gap-px bg-white/10 border border-white/10 rounded-lg overflow-hidden max-w-sm w-full mx-auto text-left text-xs font-mono">
                {BOOT_ROWS.slice(0, visibleRows).map((row) => (
                    <div key={row.label} className="bg-black/80 p-3 flex justify-between">
                        <span className="text-gray-500">{row.label}:</span>
                        <span className={row.color === 'green' ? 'text-neon-green' : 'text-white'}>{row.value}</span>
                    </div>
                ))}
            </div>

            <p className={`mt-6 text-center text-xs font-mono tracking-[0.3em] uppercase transition-opacity duration-300 ${visibleRows >= BOOT_ROWS.length ? 'text-neon-green opacity-100' : 'text-gray-600 opacity-0'}`}>
                Starting Desktop Shell_
            </p>
          </div>
        )}
        </div>

      </div>
    </div>
  );
};

export default LandingCard;
