import { Folder, GitBranch, Globe, RefreshCw, Star, GitFork, Zap } from 'lucide-react';
import CyberFrame from '@/components/CyberFrame';
import { useOSStore } from '@/store/useOSStore';
import { usePinnedRepos, PinnedRepo } from '@/hooks/usePinnedRepos';

interface CuratedProject {
  id: number;
  repoId: string; // matches a pinned-repos.json entry id, for live stats + FLASH linking
  title: string;
  type: string;
  desc: string;
  status: string;
  sourceUrl: string;
  deployUrl: string;
}

const curatedProjects: CuratedProject[] = [
  {
    id: 2,
    repoId: 'meshrf',
    title: 'MeshRF',
    type: 'Simulation',
    desc: 'Radio frequency propagation modeling tool for mesh network planning.',
    status: 'STABLE',
    sourceUrl: 'https://github.com/d3mocide/meshrf',
    deployUrl: 'https://meshrf.net',
  },
  {
    id: 3,
    repoId: 'd3_os',
    title: 'd3_OS',
    type: 'WebOS',
    desc: 'React-based operating system simulation. You are here.',
    status: 'DEV',
    sourceUrl: 'https://github.com/d3mocide/d3_os',
    deployUrl: 'https://d3frag.net',
  },
  {
    id: 4,
    repoId: 'Sovereign_Watch',
    title: 'Sovereign Watch',
    type: 'Intelligence Platform',
    desc: 'Distributed Multi-INT Fusion Center designed for decentralized situational awareness.',
    status: 'ALPHA',
    sourceUrl: 'https://github.com/d3mocide/Sovereign_Watch',
    deployUrl: 'https://github.com/d3mocide/Sovereign_Watch',
  },
];

const RepoStats = ({ repo }: { repo?: PinnedRepo }) => {
  if (!repo || repo.stars === null) return null;
  return (
    <div className="flex items-center space-x-3 text-[10px] text-gray-500">
      <span className="flex items-center space-x-1">
        <Star size={11} className="text-neon-yellow" />
        <span>{repo.stars}</span>
      </span>
      <span className="flex items-center space-x-1">
        <GitFork size={11} />
        <span>{repo.forks}</span>
      </span>
      {repo.language && <span className="text-neon-blue">{repo.language}</span>}
    </div>
  );
};

const ProjectExplorer = () => {
  const { openWindow } = useOSStore();
  const { repos, username, updatedAt, syncError, loading } = usePinnedRepos();

  const repoById = new Map(repos.map((r) => [r.id, r]));
  const curatedRepoIds = new Set(curatedProjects.map((p) => p.repoId));
  const discoveredRepos = repos.filter((r) => !curatedRepoIds.has(r.id) && !r.isArchived);

  const openFlasher = (projectId: string) => {
    openWindow('flasher', 'WEB_FLASHER', { projectId });
  };

  return (
    <div className="h-full overflow-auto p-1 space-y-4">
      <div className="flex items-center justify-between px-1 text-[10px] font-mono text-gray-500">
        <span className="flex items-center space-x-1">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          <span>
            GITHUB.COM/{username.toUpperCase()}
            {updatedAt && ` · SYNCED ${new Date(updatedAt).toLocaleDateString()}`}
            {syncError && !loading && ` · ${syncError.toUpperCase()}`}
          </span>
        </span>
        <button
          onClick={() => window.open(`https://github.com/${username}`, '_blank')}
          className="hover:text-neon-blue transition-colors"
        >
          VIEW PROFILE →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {curatedProjects.map((p) => {
          const repo = repoById.get(p.repoId);
          return (
            <CyberFrame key={p.id} variant="secondary" className="hover:scale-[1.02] transition-transform">
              <div className="p-4 space-y-2 h-full flex flex-col">
                <div className="flex justify-between items-start">
                  <Folder className="text-neon-blue" size={24} />
                  <span className="text-[10px] bg-neon-blue/10 px-2 py-0.5 rounded text-neon-blue border border-neon-blue/20">
                    {p.status}
                  </span>
                </div>

                <h3 className="text-white font-bold tracking-wide">{p.title}</h3>
                <p className="text-gray-400 text-xs flex-1">{p.desc}</p>
                <RepoStats repo={repo} />

                <div className="pt-2 flex space-x-2 border-t border-white/5">
                  <button
                    onClick={() => window.open(p.sourceUrl, '_blank')}
                    className="flex items-center space-x-1 text-[10px] text-gray-500 hover:text-neon-blue transition-colors"
                  >
                    <GitBranch size={12} />
                    <span>SOURCE</span>
                  </button>
                  <div className="w-px bg-white/10" />
                  <button
                    onClick={() => openWindow(`browser_${p.id}`, `DEPLOY: ${p.title}`, { type: 'browser', url: p.deployUrl })}
                    className="flex items-center space-x-1 text-[10px] text-gray-500 hover:text-neon-blue transition-colors"
                  >
                    <Globe size={12} />
                    <span>DEPLOY</span>
                  </button>
                  {repo?.flashable && (
                    <>
                      <div className="w-px bg-white/10" />
                      <button
                        onClick={() => openFlasher(p.repoId)}
                        className="flex items-center space-x-1 text-[10px] text-neon-green hover:text-white transition-colors"
                      >
                        <Zap size={12} />
                        <span>FLASH</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </CyberFrame>
          );
        })}
      </div>

      {discoveredRepos.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="px-1 text-[10px] font-mono text-gray-500 border-t border-white/5 pt-3">
            MORE FROM GITHUB
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {discoveredRepos.map((repo) => (
              <CyberFrame key={repo.id} variant="primary" className="hover:scale-[1.02] transition-transform">
                <div className="p-4 space-y-2 h-full flex flex-col">
                  <div className="flex justify-between items-start">
                    <Folder className="text-neon-green" size={20} />
                    {repo.language && (
                      <span className="text-[10px] bg-neon-green/10 px-2 py-0.5 rounded text-neon-green border border-neon-green/20">
                        {repo.language}
                      </span>
                    )}
                  </div>

                  <h3 className="text-white font-bold tracking-wide">{repo.name}</h3>
                  <p className="text-gray-400 text-xs flex-1">{repo.description || 'No description provided.'}</p>
                  <RepoStats repo={repo} />

                  <div className="pt-2 flex space-x-2 border-t border-white/5">
                    <button
                      onClick={() => window.open(repo.url, '_blank')}
                      className="flex items-center space-x-1 text-[10px] text-gray-500 hover:text-neon-blue transition-colors"
                    >
                      <GitBranch size={12} />
                      <span>SOURCE</span>
                    </button>
                    {repo.homepageUrl && (
                      <>
                        <div className="w-px bg-white/10" />
                        <button
                          onClick={() => openWindow(`browser_${repo.id}`, `DEPLOY: ${repo.name}`, { type: 'browser', url: repo.homepageUrl })}
                          className="flex items-center space-x-1 text-[10px] text-gray-500 hover:text-neon-blue transition-colors"
                        >
                          <Globe size={12} />
                          <span>DEPLOY</span>
                        </button>
                      </>
                    )}
                    {repo.flashable && (
                      <>
                        <div className="w-px bg-white/10" />
                        <button
                          onClick={() => openFlasher(repo.id)}
                          className="flex items-center space-x-1 text-[10px] text-neon-green hover:text-white transition-colors"
                        >
                          <Zap size={12} />
                          <span>FLASH</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </CyberFrame>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectExplorer;
