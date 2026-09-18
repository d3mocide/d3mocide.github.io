import { Folder, GitBranch, Globe, RefreshCw, Star, GitFork, Zap } from 'lucide-react';
import CyberFrame from '@/components/CyberFrame';
import { useOSStore } from '@/store/useOSStore';
import { usePinnedRepos, PinnedRepo } from '@/hooks/usePinnedRepos';

const RepoStats = ({ repo }: { repo: PinnedRepo }) => {
  if (repo.stars === null) return null;
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

  const openFlasher = (projectId: string) => {
    openWindow('flasher', 'WEB_FLASHER', { projectId });
  };

  const visibleRepos = repos.filter((r) => !r.isArchived);

  return (
    <div className="h-full overflow-auto p-1 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap px-1 text-[10px] font-mono text-gray-500">
        <span className="flex items-start space-x-1 min-w-0">
          <RefreshCw size={11} className={`shrink-0 mt-0.5 ${loading ? 'animate-spin' : ''}`} />
          <span>
            GITHUB.COM/{username.toUpperCase()}
            {updatedAt && ` · SYNCED ${new Date(updatedAt).toLocaleDateString()}`}
            {syncError && !loading && ` · ${syncError.toUpperCase()}`}
          </span>
        </span>
        <button
          onClick={() => window.open(`https://github.com/${username}`, '_blank')}
          className="shrink-0 hover:text-neon-blue transition-colors"
        >
          VIEW PROFILE →
        </button>
      </div>

      {loading && visibleRepos.length === 0 && (
        <div className="h-64 flex flex-col items-center justify-center text-center text-gray-500 space-y-2">
          <RefreshCw size={28} className="animate-spin text-gray-600" />
          <p className="font-mono text-sm">SYNCING WITH GITHUB...</p>
        </div>
      )}

      {!loading && visibleRepos.length === 0 && (
        <div className="h-64 flex flex-col items-center justify-center text-center text-gray-500 space-y-2 px-8">
          <Folder size={28} className="text-gray-600" />
          <p className="font-mono text-sm text-gray-400">NO PINNED REPOS SYNCED</p>
          <p className="text-xs max-w-sm">
            Pin some repos on your GitHub profile, then add the <code className="text-neon-blue">PINNED_REPOS_TOKEN</code>{' '}
            repo secret so the deploy workflow can sync them here.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleRepos.map((repo) => (
          <CyberFrame key={repo.id} variant="secondary" className="hover:scale-[1.02] transition-transform">
            <div className="p-4 space-y-2 h-full flex flex-col">
              <div className="flex justify-between items-start">
                <Folder className="text-neon-blue" size={22} />
                {repo.language && (
                  <span className="text-[10px] bg-neon-blue/10 px-2 py-0.5 rounded text-neon-blue border border-neon-blue/20">
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
                      onClick={() => window.open(repo.homepageUrl as string, '_blank')}
                      className="flex items-center space-x-1 text-[10px] text-gray-500 hover:text-neon-blue transition-colors"
                    >
                      <Globe size={12} />
                      <span>SITE</span>
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
  );
};

export default ProjectExplorer;
