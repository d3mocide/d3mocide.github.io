import { useIP } from '@/hooks/useIP';
import { useOSStore, THEMES, type ThemeId } from '@/store/useOSStore';
import { LeaderRow, Rule, TextButton, TextSlider, Toggle } from '@/components/ascii/primitives';
import { APPS } from '@/lib/apps';

const SOUNDS = [
  { key: 'click', label: 'Click SFX' },
  { key: 'hover', label: 'Hover SFX' },
  { key: 'keypress', label: 'Keypress SFX' },
  { key: 'error', label: 'Error SFX' },
] as const;

const Settings = () => {
  const {
    volume, isMuted, setVolume, setMuted, soundEnabled, toggleSound,
    theme, setTheme, scanlines, setScanlines, fieldIntensity, setFieldIntensity, reduceMotion, setReduceMotion, resetLayout,
  } = useOSStore();
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
        <div className="space-y-3 px-1">
          <div>
            <p className="text-xs text-gray-400 mb-1">Theme</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1" role="radiogroup" aria-label="Theme">
              {THEMES.map((t: ThemeId) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={theme === t}
                  onClick={() => setTheme(t)}
                  className={`text-xs font-mono uppercase tracking-wider px-1 rounded-[3px] transition-colors ${
                    theme === t ? 'text-neon-green bg-neon-green/10' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {theme === t ? '(●)' : '( )'} {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">ASCII field intensity</span>
              <span className="text-neon-green">{fieldIntensity === 0 ? 'OFF' : `${fieldIntensity}%`}</span>
            </div>
            <TextSlider label="ASCII field intensity" value={fieldIntensity} onChange={setFieldIntensity} />
          </div>

          <div className="grid grid-cols-2 gap-1">
            <Toggle checked={scanlines} onChange={() => setScanlines(!scanlines)}>Scanlines</Toggle>
            <Toggle checked={reduceMotion} onChange={() => setReduceMotion(!reduceMotion)}>Reduce motion</Toggle>
          </div>
        </div>
      </section>

      {/* Keyboard */}
      <section className="space-y-3">
        <Rule label="KEYBOARD" tone="blue" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-1 text-xs">
          {APPS.map((a) => (
            <div key={a.id} className="flex justify-between"><span className="text-gray-400">{a.label}</span><span className="text-neon-green">Alt+{a.key}</span></div>
          ))}
          <div className="flex justify-between"><span className="text-gray-400">Focus window</span><span className="text-neon-green">Alt+1…9</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Prev / next</span><span className="text-neon-green">Alt+[ ]</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Close</span><span className="text-neon-green">Alt+W</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Maximize</span><span className="text-neon-green">Alt+Enter</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Snap left / right</span><span className="text-neon-green">Alt+←/→</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Show desktop</span><span className="text-neon-green">Alt+D</span></div>
        </div>
        <div className="px-1 flex items-center gap-3 text-xs text-gray-500">
          <TextButton boxed tone="gray" onClick={resetLayout}>RESET WINDOW LAYOUT</TextButton>
          <span>Drag a window to a screen edge to snap it.</span>
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
