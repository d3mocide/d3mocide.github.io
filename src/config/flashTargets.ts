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
export const flashTargets: FlashTarget[] = [
  {
    id: 'loratrace-rx',
    project: 'LoRaTrace RX',
    board: 'ESP32-S3',
    description: 'Passive LoRa and sub-GHz field logging',
    // Not auto-discoverable: manifest is a CI build artifact deployed to the
    // project's own GitHub Pages site, never committed to firmware/manifest.json.
    manifestUrl: 'https://d3frag.net/LoRaTrace-RX/manifest-stable.json',
    docsUrl: 'https://github.com/d3mocide/LoRaTrace-RX',
  },
  {
    id: 'openmanet-xiao-gateway',
    project: 'OpenMANET XIAO Gateway',
    board: 'ESP32-S3',
    description:
      'Firmware for a Seeed XIAO ESP32-S3 + Seeed XIAO WM6108 (HaLow) node that acts as a mesh-connected access point for the OpenMANET project.',
    // Not auto-discoverable: manifest is a CI build artifact deployed to the
    // project's own GitHub Pages site, never committed to firmware/manifest.json.
    manifestUrl: 'https://d3frag.net/OpenMANET-XIAO-Gateway/manifest.json',
    docsUrl: 'https://github.com/d3mocide/OpenMANET-XIAO-Gateway',
  },
];
