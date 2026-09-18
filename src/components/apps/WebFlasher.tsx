import { useEffect, useState } from 'react';
import { Cpu, ExternalLink, ShieldAlert, Zap } from 'lucide-react';
import CyberFrame from '@/components/CyberFrame';
import { flashTargets } from '@/config/flashTargets';

import 'esp-web-tools/dist/web/install-button.js';

interface WebFlasherProps {
  highlightId?: string;
}

const WebFlasher = ({ highlightId }: WebFlasherProps) => {
  const [serialSupported, setSerialSupported] = useState(true);

  useEffect(() => {
    setSerialSupported('serial' in navigator && window.isSecureContext);
  }, []);

  return (
    <div className="h-full flex flex-col p-1 space-y-4 overflow-hidden">
      <div className="border-b border-neon-green/20 pb-3 px-1 flex items-start justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold text-neon-green text-glow-green flex items-center gap-2">
            <Zap size={18} />
            WEB_FLASHER
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Flash firmware to SBCs &amp; microcontrollers directly over USB — no drivers, no CLI.
          </p>
        </div>
      </div>

      {!serialSupported && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-neon-red/10 border border-neon-red/30 text-neon-red text-xs shrink-0">
          <ShieldAlert size={16} className="shrink-0 mt-0.5" />
          <span>
            Web Serial isn&apos;t available here. Open this app in Chrome or Edge over HTTPS (or localhost) to flash
            devices.
          </span>
        </div>
      )}

      <div className="flex-1 overflow-auto grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
        {flashTargets.length === 0 && (
          <div className="md:col-span-2 h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-2 py-12">
            <Cpu size={32} className="text-gray-600" />
            <p className="font-mono text-sm text-gray-400">NO FIRMWARE TARGETS CONFIGURED</p>
            <p className="text-xs max-w-sm">
              Publish a manifest.json + firmware binaries for a project, then add it to{' '}
              <code className="text-neon-blue">src/config/flashTargets.ts</code>. See the README for the manifest
              schema.
            </p>
          </div>
        )}

        {flashTargets.map((target) => (
          <CyberFrame
            key={target.id}
            variant={target.id === highlightId ? 'secondary' : 'primary'}
            className={target.id === highlightId ? 'ring-1 ring-neon-blue/50' : ''}
          >
            <div className="p-4 space-y-2 h-full flex flex-col">
              <div className="flex justify-between items-start">
                <Cpu className="text-neon-green" size={22} />
                <span className="text-[10px] bg-neon-green/10 px-2 py-0.5 rounded text-neon-green border border-neon-green/20">
                  {target.board}
                </span>
              </div>

              <h3 className="text-white font-bold tracking-wide">{target.project}</h3>
              <p className="text-gray-400 text-xs flex-1">{target.description}</p>

              <div className="pt-2 space-y-2 border-t border-white/5">
                <esp-web-install-button manifest={target.manifestUrl}>
                  <button
                    slot="activate"
                    className="w-full flex items-center justify-center space-x-2 text-xs font-mono font-bold py-2 rounded bg-neon-green/10 border border-neon-green/40 text-neon-green hover:bg-neon-green/20 transition-colors"
                  >
                    <Zap size={14} />
                    <span>CONNECT &amp; FLASH</span>
                  </button>
                  <p slot="unsupported" className="text-[10px] text-neon-red text-center">
                    Your browser doesn&apos;t support Web Serial. Use Chrome or Edge.
                  </p>
                  <p slot="not-allowed" className="text-[10px] text-neon-red text-center">
                    Flashing requires HTTPS (or localhost).
                  </p>
                </esp-web-install-button>

                {target.docsUrl && (
                  <button
                    onClick={() => window.open(target.docsUrl, '_blank')}
                    className="w-full flex items-center justify-center space-x-1 text-[10px] text-gray-500 hover:text-neon-blue transition-colors"
                  >
                    <ExternalLink size={12} />
                    <span>FLASHING DOCS</span>
                  </button>
                )}
              </div>
            </div>
          </CyberFrame>
        ))}
      </div>
    </div>
  );
};

export default WebFlasher;
