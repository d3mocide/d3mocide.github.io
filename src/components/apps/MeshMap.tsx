import { useEffect, useMemo, useRef, useState } from 'react';
import { useOSStore } from '@/store/useOSStore';
import { usePinnedRepos } from '@/hooks/usePinnedRepos';
import { buildMesh, drawMesh, hitTest, layoutMesh, MeshSim, type MeshLayout } from '@/lib/mesh';
import { buildAtlas, makePainter, makePalette } from '@/lib/glyphAtlas';
import { getPrimaryHex } from '@/lib/theme';
import { LeaderRow, Rule, Spinner, TextButton } from '@/components/ascii/primitives';

// Interactive view of the same mesh that hums in the background. Everything on it is a
// real pinned repo (or an anonymous relay); signal strength and packets are simulated.

const MeshMap = () => {
  const { repos, loading } = usePinnedRepos();
  const mesh = useMemo(() => buildMesh(repos), [repos]);
  const selectedId = useOSStore((s) => s.selectedNode);
  const selectNode = useOSStore((s) => s.selectNode);
  const openWindow = useOSStore((s) => s.openWindow);
  const theme = useOSStore((s) => s.theme);
  const reduceMotion = useOSStore((s) => s.reduceMotion);

  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<MeshSim | null>(null);
  const hoverRef = useRef(-1);
  const selectedRef = useRef(-1);
  const [, setTick] = useState(0);

  const selectedIndex = mesh.nodes.findIndex((n) => n.id === selectedId);
  selectedRef.current = selectedIndex;
  const selected = selectedIndex >= 0 ? mesh.nodes[selectedIndex] : null;

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!box || !canvas || !ctx) return;

    const sim = new MeshSim(mesh);
    simRef.current = sim;
    let layout: MeshLayout | null = null;
    let put: ReturnType<typeof makePainter> | null = null;
    const cw = 9, ch = 16;
    let cols = 0, rows = 0, dpr = 1, raf = 0, last = 0;
    let compact = false; // too narrow to label every node

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = box.clientWidth;
      const h = box.clientHeight;
      cols = Math.max(20, Math.floor(w / cw));
      rows = Math.max(10, Math.floor(h / ch));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      compact = cols < 64;
      layout = layoutMesh(mesh, cols, rows);
      put = makePainter(ctx, buildAtlas(cw, ch, dpr, makePalette(getPrimaryHex())), cw, ch, dpr, cols, rows);
    };

    const draw = (now: number) => {
      if (!put || !layout) return;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // faint grid of dots so the empty space still reads as a map
      for (let j = 1; j < rows; j += 2) for (let i = 2; i < cols; i += 4) put('.', i, j, 'gray', 0.07);
      sim.step(now, layout, reduceMotion ? 0 : 1);
      drawMesh(put, mesh, layout, sim, { alpha: 1, hover: hoverRef.current, selected: selectedRef.current, now, labels: compact ? 'hot' : 'all' });
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < (reduceMotion ? 170 : 33)) return;
      last = now;
      draw(now);
    };

    const cellAt = (e: PointerEvent | MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      return { col: Math.floor((e.clientX - r.left) / cw), row: Math.floor((e.clientY - r.top) / ch) };
    };
    const onMove = (e: PointerEvent) => {
      const { col, row } = cellAt(e);
      hoverRef.current = layout ? hitTest(mesh, layout, col, row, !compact) : -1;
      canvas.style.cursor = hoverRef.current >= 0 ? 'pointer' : 'default';
    };
    const onLeave = () => { hoverRef.current = -1; };
    const onClick = (e: MouseEvent) => {
      const { col, row } = cellAt(e);
      const hit = layout ? hitTest(mesh, layout, col, row, !compact) : -1;
      selectNode(hit >= 0 ? mesh.nodes[hit].id : null);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('click', onClick);
    raf = requestAnimationFrame(loop);
    const telemetry = setInterval(() => setTick((n) => n + 1), 1500);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(telemetry);
      ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('click', onClick);
    };
  }, [mesh, theme, reduceMotion, selectNode]);

  const neighbours = selected
    ? mesh.links.flatMap((l) => (l.a === selectedIndex ? [mesh.nodes[l.b]] : l.b === selectedIndex ? [mesh.nodes[l.a]] : []))
    : [];
  const repo = selected?.repo;

  return (
    <div className="h-full flex flex-col md:flex-row gap-3 -m-1">
      <div ref={boxRef} className="relative flex-1 min-h-[240px] border border-dashed border-white/10 rounded-[3px] overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0" role="img" aria-label="Interactive mesh network map. A list of the same nodes follows." />
        {loading && repos.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-neon-green text-sm"><Spinner className="mr-2" /> SYNCING NODES</div>
        )}
      </div>

      <div className="md:w-60 shrink-0 flex flex-col gap-3 overflow-auto text-xs">
        <Rule label="NODES" tone="blue" />
        <ul className="space-y-0.5">
          {mesh.nodes.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                aria-pressed={n.id === selectedId}
                onClick={() => selectNode(n.id === selectedId ? null : n.id)}
                className={`w-full text-left px-1 rounded-[3px] transition-colors ${
                  n.id === selectedId ? 'bg-neon-green/10 text-neon-green' : n.kind === 'repo' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                <span aria-hidden>{n.id === selectedId ? '▸' : n.kind === 'repo' ? '·' : ' '}</span> {n.label}
              </button>
            </li>
          ))}
        </ul>

        <Rule label={selected ? 'DETAIL' : 'TELEMETRY'} tone="pink" />
        {selected ? (
          <div className="space-y-2">
            <p className="text-white font-bold">{selected.label}</p>
            {repo ? (
              <>
                <p className="text-gray-400">{repo.description || 'No description provided.'}</p>
                {repo.stars !== null && <LeaderRow label="Stars" tone="yellow">★ {repo.stars}</LeaderRow>}
                {repo.language && <LeaderRow label="Language" tone="blue">{repo.language}</LeaderRow>}
                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                  <TextButton tone="gray" onClick={() => window.open(repo.url, '_blank')}>SOURCE</TextButton>
                  {repo.homepageUrl && <TextButton tone="blue" onClick={() => window.open(repo.homepageUrl as string, '_blank')}>SITE</TextButton>}
                  {repo.flashable && <TextButton tone="green" onClick={() => openWindow('flasher', 'WEB_FLASHER', { projectId: repo.id })}>FLASH</TextButton>}
                  <TextButton tone="pink" onClick={() => openWindow('projects', 'PROJECT_EXPLORER')}>EXPLORER</TextButton>
                </div>
              </>
            ) : (
              <p className="text-gray-500">Anonymous relay. Forwards packets between neighbouring nodes; no project attached.</p>
            )}
            <LeaderRow label="Signal (sim)" tone="blue">{simRef.current?.rssi[selectedIndex] ?? '—'} dBm</LeaderRow>
            <LeaderRow label="Links">{neighbours.length}</LeaderRow>
            <p className="text-gray-600">Neighbours: {neighbours.map((n) => n.label).join(', ') || 'none'}</p>
          </div>
        ) : (
          <div className="space-y-2 text-gray-500">
            <p>Click a node on the map or in the list. Pinned repos are the named nodes; the rest are relays.</p>
            <LeaderRow label="Nodes">{mesh.nodes.length}</LeaderRow>
            <LeaderRow label="Links">{mesh.links.length}</LeaderRow>
            <p className="text-gray-600">Signal strength and packet traffic are simulated.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeshMap;
