export interface FlashTarget {
  id: string;
  project: string;
  board: string;
  description: string;
  manifestUrl: string;
  docsUrl?: string;
}

// Firmware targets are normally auto-discovered: any pinned GitHub repo that
// publishes an esp-web-tools manifest at `firmware/manifest.json` on its
// default branch shows up in the Web Flasher automatically (no edits here —
// see scripts/fetch-pinned-repos.mjs and README.md > "Web Flasher").
//
// Use this file only for one-off overrides — e.g. a manifest hosted outside
// GitHub, or a project that isn't (or can't be) pinned. Entries here are
// skipped if their `id` matches an auto-discovered project, so they never
// show up twice.
//
// Example:
// {
//   id: 'meshrf-node',
//   project: 'MeshRF',
//   board: 'ESP32-S3',
//   description: 'MeshRF node firmware — LoRa mesh relay.',
//   manifestUrl: 'https://meshrf.net/firmware/manifest.json',
//   docsUrl: 'https://github.com/d3mocide/meshrf#flashing',
// },
export const flashTargets: FlashTarget[] = [];
