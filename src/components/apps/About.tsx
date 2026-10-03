import { useMemo } from 'react';
import { usePinnedRepos } from '@/hooks/usePinnedRepos';
import { useOSStore } from '@/store/useOSStore';
import { LeaderRow, Rule, Spinner, Tag, TextButton } from '@/components/ascii/primitives';

// Terminal-style readout. Only facts we actually have: the org description, the live pinned
// repos (and their topics), and the GitHub profile.

const About = () => {
  const { repos, username, loading } = usePinnedRepos();
  const openWindow = useOSStore((s) => s.openWindow);
  const selectNode = useOSStore((s) => s.selectNode);

  const visible = repos.filter((r) => !r.isArchived);
  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    visible.forEach((r) => r.topics.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t);
  }, [visible]);
  const stars = visible.reduce((n, r) => n + (r.stars ?? 0), 0);

  return (
    <div className="space-y-5 text-sm">
      <p className="text-xs">
        <span className="text-neon-green">guest@d3frag:~$</span> <span className="text-white">cat about.txt</span>
      </p>

      <section className="space-y-2">
        <Rule label="ABOUT" />
        <p className="text-gray-300">
          d3FRAG Networks is a Portland based organization specializing in Radio Frequency Analysis and Mesh Network tool
          development.
        </p>
      </section>

      <section className="space-y-2">
        <Rule label="FOCUS" tone="blue" />
        {loading && <p className="text-xs text-gray-500"><Spinner className="mr-1" /> reading topics...</p>}
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          {topics.map((t) => <Tag key={t} tone="blue">{t}</Tag>)}
        </div>
      </section>

      <section className="space-y-2">
        <Rule label="PROJECTS" tone="pink" />
        <div className="space-y-1.5">
          {visible.map((r) => (
            <div key={r.id} className="text-xs">
              <button
                type="button"
                className="text-white font-bold hover:text-neon-pink transition-colors text-left"
                onClick={() => { selectNode(r.id); openWindow('mesh', 'MESH_MAP'); }}
              >
                <span aria-hidden className="text-gray-600">▸ </span>{r.name}
              </button>
              <span className="text-gray-500"> — {r.description ? (r.description.length > 90 ? r.description.slice(0, 89) + '…' : r.description) : 'No description provided.'}</span>
            </div>
          ))}
        </div>
        {visible.length > 0 && <LeaderRow label="Combined stars" tone="yellow">★ {stars}</LeaderRow>}
      </section>

      <section className="space-y-2">
        <Rule label="LINKS" tone="yellow" />
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <TextButton tone="green" onClick={() => window.open(`https://github.com/${username}`, '_blank')}>GITHUB/{username.toUpperCase()}</TextButton>
          <TextButton tone="blue" onClick={() => openWindow('projects', 'PROJECT_EXPLORER')}>PROJECT EXPLORER</TextButton>
          <TextButton tone="pink" onClick={() => openWindow('mesh', 'MESH_MAP')}>MESH MAP</TextButton>
        </div>
      </section>
    </div>
  );
};

export default About;
