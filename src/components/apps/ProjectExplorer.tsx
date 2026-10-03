import CyberFrame from '@/components/CyberFrame';
import { Rule, Spinner, Tag, TextButton } from '@/components/ascii/primitives';
import { useOSStore } from '@/store/useOSStore';
import { usePinnedRepos, PinnedRepo } from '@/hooks/usePinnedRepos';

const RepoStats = ({ repo }: { repo: PinnedRepo }) => {
  if (repo.stars === null) return null;
  return (
    <div className="flex items-center gap-3 text-[11px] text-gray-500">
      <span><span className="text-neon-yellow" aria-hidden>★</span> {repo.stars}<span className="sr-only"> stars</span></span>
      <span><span aria-hidden>⑂</span> {repo.forks}<span className="sr-only"> forks</span></span>
      {repo.language && (
        <span>
          <span aria-hidden style={{ color: repo.languageColor ?? undefined }}>●</span> {repo.language}
        </span>
      )}
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
      <div className="space-y-2 px-1">
        <Rule label={`~/${username}/pinned`} tone="blue" />
        <div className="flex items-start justify-between gap-3 flex-wrap text-[10px] text-gray-500">
          <span className="min-w-0">
            {loading && <Spinner className="mr-1 text-neon-blue" />}
            GITHUB.COM/{username.toUpperCase()}
            {updatedAt && ` · SYNCED ${new Date(updatedAt).toLocaleDateString()}`}
            {syncError && !loading && ` · ${syncError.toUpperCase()}`}
          </span>
          <TextButton tone="blue" onClick={() => window.open(`https://github.com/${username}`, '_blank')}>
            VIEW PROFILE →
          </TextButton>
        </div>
      </div>

      {loading && visibleRepos.length === 0 && (
        <div className="h-64 flex flex-col items-center justify-center text-center text-gray-500 space-y-2">
          <Spinner className="text-3xl text-neon-blue" />
          <p className="text-sm">SYNCING WITH GITHUB...</p>
        </div>
      )}

      {!loading && visibleRepos.length === 0 && (
        <div className="h-64 flex flex-col items-center justify-center text-center text-gray-500 space-y-2 px-8">
          <p className="text-sm text-gray-400">[ NO PINNED REPOS SYNCED ]</p>
          <p className="text-xs max-w-sm">
            Pin some repos on your GitHub profile, then add the <code className="text-neon-blue">PINNED_REPOS_TOKEN</code>{' '}
            repo secret so the deploy workflow can sync them here.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleRepos.map((repo, idx) => (
          <CyberFrame key={repo.id} variant="secondary" interactive className="group">
            <div className="p-4 space-y-2 h-full flex flex-col relative">
              <span aria-hidden className="absolute top-1 right-2 text-[10px] text-gray-700">{String(idx + 1).padStart(2, '0')}</span>

              <h3 className="text-white font-bold tracking-wide group-hover:text-neon-blue transition-colors">
                <span aria-hidden className="text-gray-600 group-hover:text-neon-blue transition-colors">▸ </span>
                {repo.name}
              </h3>
              <p className="text-gray-400 text-xs flex-1">{repo.description || 'No description provided.'}</p>
              <RepoStats repo={repo} />

              <div className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-white/10">
                <TextButton tone="gray" onClick={() => window.open(repo.url, '_blank')}>SOURCE</TextButton>
                {repo.homepageUrl && (
                  <TextButton tone="blue" onClick={() => window.open(repo.homepageUrl as string, '_blank')}>SITE</TextButton>
                )}
                {repo.flashable && (
                  <TextButton tone="green" onClick={() => openFlasher(repo.id)}>FLASH</TextButton>
                )}
                {repo.topics.length > 0 && (
                  <span className="ml-auto hidden sm:inline"><Tag tone="gray">{repo.topics[0]}</Tag></span>
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
