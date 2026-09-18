export interface FlashTarget {
  id: string;
  project: string;
  board: string;
  description: string;
  manifestUrl: string;
  docsUrl?: string;
}

// Add one entry per project once its manifest.json + firmware binaries are
// published (see README.md > "Web Flasher" for the manifest.json schema that
// esp-web-tools expects, and where to host it). `id` should match the
// corresponding project/pinned-repo id so the Projects app's FLASH button can
// deep-link here.
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
