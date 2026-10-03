import { useEffect, useState } from 'react';
import CyberFrame from '@/components/CyberFrame';
import { Rule, Spinner, Tag, TextButton } from '@/components/ascii/primitives';
import { flashTargets } from '@/config/flashTargets';
import { usePinnedRepos } from '@/hooks/usePinnedRepos';

import 'esp-web-tools/dist/web/install-button.js';

interface WebFlasherProps {
  highlightId?: string;
}

interface DisplayTarget {
  id: string;
  project: string;
  board: string;
  description: string;
  manifestUrl: string;
  docsUrl?: string;
  firmwareVersion?: string | null;
}

const WebFlasher = ({ highlightId }: WebFlasherProps) => {
  const [serialSupported, setSerialSupported] = useState(true);
  const { repos, loading } = usePinnedRepos();

  useEffect(() => {
    setSerialSupported('serial' in navigator && window.isSecureContext);
  }, []);

  // Auto-discovered from any pinned repo that publishes firmware/manifest.json
  // on its default branch (see scripts/fetch-pinned-repos.mjs) — no config
  // needed here. flashTargets.ts is only for manual/one-off overrides, and is
  // skipped for any id already auto-discovered so a project never shows twice.
  const autoTargets: DisplayTarget[] = repos
    .filter((r) => r.manifestUrl)
    .map((r) => ({
      id: r.id,
      project: r.name,
      board: r.chipFamilies.length > 0 ? r.chipFamilies.join(' / ') : 'ESP32',
      description: r.description || 'No description provided.',
      manifestUrl: r.manifestUrl as string,
      docsUrl: r.url,
      firmwareVersion: r.firmwareVersion,
    }));
  const autoIds = new Set(autoTargets.map((t) => t.id));
  const manualTargets: DisplayTarget[] = flashTargets
    .filter((t) => !autoIds.has(t.id))
    .map((t) => ({ ...t, firmwareVersion: null }));
  const targets: DisplayTarget[] = [...autoTargets, ...manualTargets];

  return (
    <div className="h-full flex flex-col p-1 space-y-4 overflow-hidden">
      <div className="px-1 space-y-2 shrink-0">
        <Rule label="FIRMWARE TARGETS" />
        <p className="text-xs text-gray-400">
          Flash firmware to SBCs &amp; microcontrollers directly over USB — no drivers, no CLI.
        </p>
      </div>

      {!serialSupported && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-[3px] bg-neon-red/10 border border-neon-red/40 text-neon-red text-xs shrink-0">
          <span aria-hidden className="font-bold">[!]</span>
          <span>
            Web Serial isn&apos;t available here. Open this app in Chrome or Edge over HTTPS (or localhost) to flash
            devices.
          </span>
        </div>
      )}

      <div className="flex-1 overflow-auto grid grid-cols-1 md:grid-cols-2 gap-4 p-1 content-start">
        {targets.length === 0 && (
          <div className="md:col-span-2 h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-2 py-12">
            {loading && <Spinner className="text-3xl text-neon-green" />}
            <p className="text-sm text-gray-400">
              {loading ? 'SYNCING WITH GITHUB...' : '[ NO FIRMWARE TARGETS FOUND ]'}
            </p>
            {!loading && (
              <p className="text-xs max-w-sm">
                Push a <code className="text-neon-blue">firmware/manifest.json</code> (+ binaries) to a pinned
                repo&apos;s default branch and it&apos;ll show up here automatically on the next sync. See the
                README for the manifest schema.
              </p>
            )}
          </div>
        )}

        {targets.map((target) => {
          const highlighted = target.id === highlightId;
          return (
            <CyberFrame
              key={target.id}
              variant={highlighted ? 'secondary' : 'primary'}
              interactive
              active={highlighted}
              className="group"
            >
              <div className="p-4 space-y-2 h-full flex flex-col">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-white font-bold tracking-wide">
                    <span aria-hidden className="text-neon-green">▸ </span>
                    {target.project}
                  </h3>
                  <Tag tone="green">{target.board}</Tag>
                </div>

                <p className="text-gray-400 text-xs flex-1">{target.description}</p>
                {target.firmwareVersion && <p className="text-[10px] text-gray-500">firmware v{target.firmwareVersion}</p>}

                <div className="pt-2 space-y-2 border-t border-dashed border-white/10">
                  <esp-web-install-button manifest={target.manifestUrl}>
                    <TextButton slot="activate" boxed tone="green" className="w-full">
                      CONNECT &amp; FLASH
                    </TextButton>
                    <p slot="unsupported" className="text-[10px] text-neon-red text-center">
                      Your browser doesn&apos;t support Web Serial. Use Chrome or Edge.
                    </p>
                    <p slot="not-allowed" className="text-[10px] text-neon-red text-center">
                      Flashing requires HTTPS (or localhost).
                    </p>
                  </esp-web-install-button>

                  {target.docsUrl && (
                    <div className="text-center">
                      <TextButton tone="gray" onClick={() => window.open(target.docsUrl, '_blank')}>
                        PROJECT PAGE ↗
                      </TextButton>
                    </div>
                  )}
                </div>
              </div>
            </CyberFrame>
          );
        })}
      </div>
    </div>
  );
};

export default WebFlasher;
