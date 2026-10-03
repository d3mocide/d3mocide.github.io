import { useIP } from '@/hooks/useIP';
import { useOSStore } from '@/store/useOSStore';
import { LeaderRow, Rule, TextButton, TextSlider, Toggle } from '@/components/ascii/primitives';

const SOUNDS = [
  { key: 'click', label: 'Click SFX' },
  { key: 'hover', label: 'Hover SFX' },
  { key: 'keypress', label: 'Keypress SFX' },
  { key: 'error', label: 'Error SFX' },
] as const;

const Settings = () => {
  const { volume, isMuted, setVolume, setMuted, soundEnabled, toggleSound } = useOSStore();
  const { ip } = useIP();

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (v > 0 && isMuted) setMuted(false);
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-6">
      <p className="text-xs text-gray-400">Configure your d3_OS experience.</p>

      {/* Audio */}
      <section className="space-y-3">
        <Rule label="AUDIO" tone="blue" />
        <div className="space-y-3 px-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300">SFX Volume</span>
            <span className="text-neon-green">{isMuted ? 'MUTED' : `${volume}%`}</span>
          </div>
          <div className="flex items-center gap-3">
            <TextButton boxed tone={isMuted ? 'red' : 'green'} onClick={() => setMuted(!isMuted)}>
              {isMuted ? 'UNMUTE' : 'MUTE'}
            </TextButton>
            <div className="flex-1 min-w-0">
              <TextSlider label="SFX volume" value={isMuted ? 0 : volume} onChange={handleVolumeChange} disabled={isMuted} />
            </div>
          </div>

          <div>
            <p className="text-[11px] text-gray-500 mb-1">Active sound effects (click to toggle):</p>
            <div className="grid grid-cols-2 gap-1">
              {SOUNDS.map((s) => (
                <Toggle key={s.key} checked={soundEnabled[s.key]} onChange={() => toggleSound(s.key)}>
                  {s.label}
                </Toggle>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="space-y-3">
        <Rule label="APPEARANCE" tone="pink" />
        <div className="space-y-2 px-1">
          <LeaderRow label="Theme">ASCII // PHOSPHOR</LeaderRow>
          <LeaderRow label="Scanlines">ENABLED</LeaderRow>
          <LeaderRow label="ASCII field">LIVE</LeaderRow>
        </div>
      </section>

      {/* System info */}
      <section className="space-y-3">
        <Rule label="SYSTEM INFORMATION" tone="yellow" />
        <div className="space-y-2 px-1">
          <LeaderRow label="OS Version">d3_OS v1.0.0</LeaderRow>
          <LeaderRow label="Kernel">d3FRAG v3.0.4</LeaderRow>
          <LeaderRow label="Build">2026.01.24</LeaderRow>
          <LeaderRow label="Network" tone="blue">{ip}</LeaderRow>
        </div>
      </section>

      <div className="flex-1" />
      <div className="text-center text-[11px] text-gray-600 border-t border-dashed border-white/10 pt-3">
        <p>d3FRAG NETWORKS © 2026</p>
        <p className="text-neon-green/60">● SYSTEM ONLINE</p>
      </div>
    </div>
  );
};

export default Settings;
