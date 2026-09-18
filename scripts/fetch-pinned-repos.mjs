// Fetches the GitHub user's pinned repositories via the GraphQL API and writes
// them to public/data/pinned-repos.json so the Project Explorer app can read a
// static file at runtime (d3_OS is a static site with no backend, and GitHub's
// public REST API has no "pinned repos" endpoint).
//
// Also auto-discovers Web Flasher firmware: any pinned repo that publishes an
// esp-web-tools manifest at `firmware/manifest.json` on its default branch is
// picked up automatically (see README.md > "Web Flasher") — no d3_OS code
// changes needed to add a new flashable project, just push that file.
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
const MANIFEST_PATH = 'firmware/manifest.json';

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
            defaultBranchRef { name }
            manifestFile: object(expression: "HEAD:${MANIFEST_PATH}") {
              ... on Blob { text }
            }
          }
        }
      }
    }
  }
`;

// Only trust the file as an esp-web-tools manifest if it round-trips through
// JSON.parse and has the shape esp-web-tools actually expects — a repo could
// have an unrelated firmware/manifest.json for something else entirely.
function parseFirmwareManifest(repo) {
  const raw = repo.manifestFile?.text;
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`[fetch-pinned-repos] ${repo.name}: ${MANIFEST_PATH} is not valid JSON, skipping`);
    return null;
  }
  if (!Array.isArray(parsed.builds) || parsed.builds.length === 0) {
    console.warn(`[fetch-pinned-repos] ${repo.name}: ${MANIFEST_PATH} has no "builds" array, skipping`);
    return null;
  }

  const branch = repo.defaultBranchRef?.name || 'main';
  return {
    manifestUrl: `https://raw.githubusercontent.com/${USERNAME}/${repo.name}/${branch}/${MANIFEST_PATH}`,
    firmwareName: typeof parsed.name === 'string' ? parsed.name : null,
    firmwareVersion: typeof parsed.version === 'string' ? parsed.version : null,
    chipFamilies: [...new Set(parsed.builds.map((b) => b.chipFamily).filter(Boolean))],
  };
}

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
  const repos = nodes.map((repo) => {
    const firmware = parseFirmwareManifest(repo);
    return {
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
      flashable: firmware !== null,
      manifestUrl: firmware?.manifestUrl ?? null,
      firmwareName: firmware?.firmwareName ?? null,
      firmwareVersion: firmware?.firmwareVersion ?? null,
      chipFamilies: firmware?.chipFamilies ?? [],
    };
  });

  const flashableCount = repos.filter((r) => r.flashable).length;
  await writeOutput(repos, null);
  console.log(`[fetch-pinned-repos] Wrote ${repos.length} pinned repos (${flashableCount} flashable) to ${OUT_PATH}`);
}

main().catch(async (err) => {
  console.error('[fetch-pinned-repos] Unexpected failure, keeping build alive with placeholder data:', err);
  await writeOutput([], 'Unexpected failure fetching pinned repos');
});
