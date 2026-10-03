import type { Tone } from '@/components/ascii/tone';

// Single registry of launchable apps: used by desktop icons, shortcuts and docs.
export interface AppDef {
  id: string;
  title: string;
  label: string;
  tone: Tone;
  /** Alt+<key> opens it */
  key: string;
  code: string;
  art: string[];
}

export const APPS: AppDef[] = [
  { id: 'terminal', title: 'D3_TERM v2.0', label: 'Terminal', tone: 'blue', key: 'T', code: 'KeyT', art: ['┌─────┐', '│>_   │', '│     │', '└─────┘'] },
  { id: 'projects', title: 'PROJECT_EXPLORER', label: 'Projects', tone: 'pink', key: 'P', code: 'KeyP', art: [' ┌──┐   ', ' │  └──┐', ' │     │', ' └─────┘'] },
  { id: 'flasher', title: 'WEB_FLASHER', label: 'Flasher', tone: 'green', key: 'F', code: 'KeyF', art: ['  ╥ ╥ ╥ ', ' ┌┴─┴─┴┐', ' │ ~~~~ │', ' └┬─┬─┬┘'] },
  { id: 'mesh', title: 'MESH_MAP', label: 'Mesh Map', tone: 'yellow', key: 'M', code: 'KeyM', art: ['(@)──(o)', ' │ ╲ ╱  ', '(o)──(@)', '        '] },
  { id: 'about', title: 'ABOUT', label: 'About', tone: 'blue', key: 'A', code: 'KeyA', art: ['┌─────┐', '│  ?  │', '│ d3  │', '└─────┘'] },
  { id: 'game', title: 'PACKET_LOSS', label: 'Packets', tone: 'pink', key: 'G', code: 'KeyG', art: ['┌─────┐', '│ooo@ │', '│   X │', '└─────┘'] },
  { id: 'settings', title: 'SYSTEM_CONFIG', label: 'Config', tone: 'yellow', key: 'S', code: 'KeyS', art: ['┌─────┐', '│ [*] │', '│ ═╪═ │', '└─────┘'] },
];
