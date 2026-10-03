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
  manifestUrl: string | null;
  firmwareName: string | null;
  firmwareVersion: string | null;
  chipFamilies: string[];
}

interface PinnedReposData {
  username: string;
  updatedAt: string | null;
  error: string | null;
  repos: PinnedRepo[];
}

// One fetch shared by every consumer (explorer, flasher, mesh background, terminal...).
let cached: Promise<PinnedReposData> | null = null;
const loadPinned = () => {
  if (!cached) {
    cached = fetch(`${import.meta.env.BASE_URL}data/pinned-repos.json`).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<PinnedReposData>;
    });
    cached.catch(() => { cached = null; }); // allow a retry on the next mount
  }
  return cached;
};

export const usePinnedRepos = () => {
  const [data, setData] = useState<PinnedReposData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadPinned()
      .then((json) => { if (alive) setData(json); })
      .catch((err) => {
        if (!alive) return;
        console.error('Failed to fetch pinned repos:', err);
        setError('GITHUB SYNC OFFLINE');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
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
