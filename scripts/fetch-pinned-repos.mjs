// Fetches the GitHub user's pinned repositories via the GraphQL API and writes
// them to public/data/pinned-repos.json so the Project Explorer app can read a
// static file at runtime (d3_OS is a static site with no backend, and GitHub's
// public REST API has no "pinned repos" endpoint).
//
// Requires a token in GITHUB_TOKEN with at least public-repo read access
// (a fine-grained PAT scoped to "Public Repositories (read-only)" is enough).
// If no token is available, this writes a placeholder file instead of failing
// the build, so CI on forks/PRs and local dev without a token still work.
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const USERNAME = process.env.GITHUB_PINNED_USER || 'd3mocide';
const TOKEN = process.env.GITHUB_TOKEN;
const OUT_PATH = path.resolve('public/data/pinned-repos.json');

const QUERY = `
  query($login: String!) {
    user(login: $login) {
      pinnedItems(first: 12, types: [REPOSITORY]) {
        nodes {
          ... on Repository {
            name
            description
            url
            homepageUrl
            stargazerCount
            forkCount
            isArchived
            primaryLanguage { name color }
            repositoryTopics(first: 10) { nodes { topic { name } } }
          }
        }
      }
    }
  }
`;

async function writeOutput(repos, error) {
  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  const payload = {
    username: USERNAME,
    updatedAt: error ? null : new Date().toISOString(),
    error: error ?? null,
    repos,
  };
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n');
}

async function main() {
  if (!TOKEN) {
    console.warn('[fetch-pinned-repos] GITHUB_TOKEN not set — writing placeholder pinned-repos.json');
    await writeOutput([], 'GITHUB_TOKEN not configured');
    return;
  }

  let response;
  try {
    response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: QUERY, variables: { login: USERNAME } }),
    });
  } catch (err) {
    console.error('[fetch-pinned-repos] Network error, keeping build alive with placeholder data:', err);
    await writeOutput([], 'Network error fetching pinned repos');
    return;
  }

  if (!response.ok) {
    console.error(`[fetch-pinned-repos] GitHub API responded ${response.status} ${response.statusText}`);
    await writeOutput([], `GitHub API error: ${response.status}`);
    return;
  }

  const json = await response.json();
  if (json.errors?.length) {
    console.error('[fetch-pinned-repos] GraphQL errors:', json.errors);
    await writeOutput([], json.errors.map((e) => e.message).join('; '));
    return;
  }

  const nodes = json.data?.user?.pinnedItems?.nodes ?? [];
  const repos = nodes.map((repo) => ({
    id: repo.name,
    name: repo.name,
    description: repo.description,
    url: repo.url,
    homepageUrl: repo.homepageUrl || null,
    stars: repo.stargazerCount,
    forks: repo.forkCount,
    isArchived: repo.isArchived,
    language: repo.primaryLanguage?.name ?? null,
    languageColor: repo.primaryLanguage?.color ?? null,
    topics: repo.repositoryTopics.nodes.map((n) => n.topic.name),
    flashable: repo.repositoryTopics.nodes.some((n) => n.topic.name === 'web-flasher'),
  }));

  await writeOutput(repos, null);
  console.log(`[fetch-pinned-repos] Wrote ${repos.length} pinned repos to ${OUT_PATH}`);
}

main().catch(async (err) => {
  console.error('[fetch-pinned-repos] Unexpected failure, keeping build alive with placeholder data:', err);
  await writeOutput([], 'Unexpected failure fetching pinned repos');
});
