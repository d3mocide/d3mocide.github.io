import { useState, useEffect } from 'react';

export interface PinnedRepo {
  id: string;
  name: string;
  description: string | null;
  url: string;
  homepageUrl: string | null;
  stars: number | null;
  forks: number | null;
  isArchived: boolean;
  language: string | null;
  languageColor: string | null;
  topics: string[];
  flashable: boolean;
}

interface PinnedReposData {
  username: string;
  updatedAt: string | null;
  error: string | null;
  repos: PinnedRepo[];
}

export const usePinnedRepos = () => {
  const [data, setData] = useState<PinnedReposData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchPinned = async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/pinned-repos.json`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PinnedReposData;
        setData(json);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch pinned repos:', err);
        setError('GITHUB SYNC OFFLINE');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchPinned();
    return () => controller.abort();
  }, []);

  return {
    repos: data?.repos ?? [],
    username: data?.username ?? 'd3mocide',
    updatedAt: data?.updatedAt ?? null,
    syncError: data?.error ?? null,
    loading,
    error,
  };
};
