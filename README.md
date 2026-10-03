# d3FRAG // d3_OS

> A cyberpunk web operating system built with React. Experience the future of retro computing.

![d3FRAG Networks](https://img.shields.io/badge/d3FRAG-NETWORKS-00ff41?style=for-the-badge)
![Status](https://img.shields.io/badge/STATUS-ONLINE-00ff41?style=for-the-badge)

## 🌐 Overview

**d3_OS** is a browser-based, text-mode operating system for d3FRAG Networks. The background is a living ASCII mesh network whose named nodes are the pinned GitHub repos, with a real window manager, a terminal and a web firmware flasher on top.

### ✨ Features

- 🕸️ **Living ASCII Mesh** - The background is a character-based mesh network: pinned repos are named nodes, packets hop between them, signal readouts tick (simulated), and clicking a node opens it on the Mesh Map
- 🗺️ **Mesh Map** - Interactive map + accessible node list with repo details, links and flash buttons
- 🪟 **Window Management** - Draggable, resizable windows with maximize, edge snapping (drag to a screen edge), and remembered positions
- 📱 **Phone-friendly** - Apps run full-screen one at a time from a launcher grid, with a home button, safe-area aware taskbar and tap-to-run terminal commands
- 🕹️ **PACKET_LOSS** - A small ASCII game hidden in the OS
- ⌨️ **Keyboard Shortcuts** - `Alt+T/P/F/M/A/G/I/S` open apps, `Alt+1…9` focus, `Alt+[ ]` cycle, `Alt+W` close, `Alt+Enter` maximize, `Alt+←/→` snap, `Alt+D` show desktop, right-click the desktop for a menu
- 🖥️ **Desktop Icons** - ASCII launchers (double-click, or tap on touch devices)
- 💻 **Terminal** - Command history, Tab completion, `neofetch`, `banner`, `open <repo>`, `theme`, `matrix` and more
- 📁 **Project Explorer** - Portfolio showcase, live-synced with your pinned GitHub repos
- ⚡ **Web Flasher** - Flash firmware to SBCs/microcontrollers over USB via Web Serial
- ℹ️ **About** - Terminal-style readout of the org and its projects
- 🎨 **Themes** - Green, amber, ice and white phosphor, switchable in System Config or with `theme <name>`
- ⚙️ **Real Settings** - ASCII field intensity, scanlines, reduce-motion (follows your OS setting by default), sound options; all remembered between visits
- 🔊 **Audio System** - Synthesized sound effects for interactions
- 🎯 **Start Menu** - Application launcher with system controls
- ⚡ **Boot Sequence** - Shown on a first visit and after shutdown; repeat visits go straight to the desktop (`reboot` replays it)

## 🌍 Live Site

Deployed to [d3frag.net](https://d3frag.net) via GitHub Pages — every push to `main` triggers a build and deploy.

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose (for containerized dev), or Node.js 20+
- Git

### Development

To run the development version (local build with hot-reloading):

```bash
# Start dev server
docker compose -f docker-compose.dev.yml up -d

# Install dependencies if needed
docker compose -f docker-compose.dev.yml run --rm app npm install

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop the environment
docker compose -f docker-compose.dev.yml down
```

Or without Docker:

```bash
npm install
npm run dev
```

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Window System**: react-draggable + re-resizable
- **Audio**: Web Audio API (synthesized)
- **Containerization**: Docker

## 📁 Project Structure

```
d3_os/
├── src/
│   ├── components/
│   │   ├── apps/          # Application components (Terminal, MeshMap, ...)
│   │   ├── ascii/         # Text-mode UI primitives (rules, tags, toggles, slider)
│   │   ├── os/             # OS shell (windows, taskbar, desktop icons)
│   │   └── fx/             # ASCII field, scanlines, text scramble
│   ├── lib/                # Mesh model + simulation, glyph atlas, ASCII art, apps registry
│   ├── config/             # Static app config (e.g. flashTargets.ts)
│   ├── store/              # Zustand state management
│   ├── hooks/              # Custom React hooks
│   └── assets/             # Static assets
├── scripts/                # Build-time scripts (e.g. pinned-repo sync)
├── public/                 # Public assets (incl. data/pinned-repos.json)
├── Dockerfile              # Docker configuration (local dev)
└── docker-compose.dev.yml  # Docker Compose setup (local dev)
```

## 🎮 Usage

### Terminal Commands

- `help` - Display available commands (Tab completes, ↑/↓ browse history)
- `about`, `whois d3frag`, `whoami`, `neofetch`, `banner`, `date`, `echo ...`
- `ls`, `cat README.txt` / `cat about.txt`
- `open <repo>` - Show a pinned project on the Mesh Map (`open` alone lists them)
- `mesh`, `projects`, `flasher`, `settings` - Launch an app
- `theme [green|amber|ice|white]` - List or switch the colour theme
- `matrix` - Take the red pill (the background turns into falling code for ~12s)
- `ping <host>` - Simulated ping (nothing leaves your browser)
- `keys` - Keyboard shortcuts
- `reboot` - Replay the boot sequence
- `sudo` - Try it and see 😉

### Keyboard Shortcuts

| Keys | Action |
| --- | --- |
| `Alt+T` `P` `F` `M` `A` `G` `I` `S` | Terminal, Projects, Flasher, Mesh Map, About, Packet Loss, Jam Invaders, Config |
| `Alt+1`…`9` | Focus the nth open window |
| `Alt+[` / `Alt+]` | Previous / next window |
| `Alt+W` / `Alt+N` | Close / minimize the focused window |
| `Alt+Enter` | Maximize / restore |
| `Alt+←` / `Alt+→` | Snap to the left / right half |
| `Alt+D` | Show desktop / restore windows |

### Applications

- **D3_TERM** - Interactive terminal
- **MESH_MAP** - Interactive map of the pinned-repo mesh network
- **PROJECT_EXPLORER** - Portfolio browser, live-synced with pinned GitHub repos
- **WEB_FLASHER** - Flash firmware to SBCs/microcontrollers over USB
- **ABOUT** - Org and project readout
- **JAM_INVADERS** - Space Invaders: defend the mesh from marching jammers, hide behind erodable firewalls, shoot the rogue AP for bonus points (`invaders` in the terminal; ←/→ + space, or on-screen pads)
- **PACKET_LOSS** - Snake-style game: route a packet through the mesh, grab gateway nodes, dodge jammers (swipe, d-pad, arrows/WASD; `game` in the terminal). Levels with firewalls, timed `$` bonuses, `?` mystery packets (turbo, slow-mo, ghost, x2, reversed controls) and a green-screen Nokia `[LCD]` skin
- **SYSTEM_CONFIG** - Theme, ASCII field, scanlines, motion, sound, keyboard reference
- **BROWSER** - Integrated web browser (opened programmatically)

> The Mesh Map's packets and signal strength (dBm) are **simulated** for atmosphere. Repo names, descriptions, stars and links are real, synced from GitHub.

## 📌 Pinned Repos Sync

Every card in the Project Explorer is generated directly from your GitHub pinned repos — there's no hardcoded
project list to keep in sync by hand. Pin or unpin something on your GitHub profile and it shows up (or disappears)
here on the next sync, with live star/fork counts and description pulled straight from GitHub.

d3_OS is a static site with no backend, and GitHub's public REST API doesn't expose "pinned repos," so the
`Deploy to GitHub Pages` workflow runs `scripts/fetch-pinned-repos.mjs` before every build, which queries GitHub's
GraphQL API for your pinned repositories and writes the result to `public/data/pinned-repos.json`. The Project
Explorer app just fetches that static file at runtime — no token ever ships to the browser.

To enable it:

1. Create a token with public read access (a fine-grained PAT scoped to **Public Repositories (read-only)**, or a
   classic PAT with no scopes, both work since pinned repos are public data).
2. Add it as a repository secret named `PINNED_REPOS_TOKEN`.
3. The workflow re-syncs on every push to `main`, on `workflow_dispatch`, and daily via a scheduled cron job.

Without the secret, the build falls back to the static snapshot committed at `public/data/pinned-repos.json` — the
app still works, it just won't reflect live star counts or newly pinned/unpinned repos. Run `npm run fetch:pinned`
locally (with `GITHUB_TOKEN` set in your shell) to refresh that file yourself.

Each card links to its GitHub repo (**SOURCE**) and, when GitHub has a homepage URL set for that repo, out to the
live site in a new tab (**SITE**) — there's no in-OS iframe preview, since not every repo has one and many sites
block being embedded anyway. Want a repo's live site linked? Set its homepage URL on GitHub
(repo page → ⚙️ next to "About").

## ⚡ Web Flasher

The Web Flasher app uses [esp-web-tools](https://esphome.github.io/esp-web-tools/) (Web Serial) to flash ESP32/ESP8266
firmware straight from the browser — no drivers or CLI. It only works in Chromium-based browsers (Chrome/Edge) served
over HTTPS or localhost.

**Firmware targets are auto-discovered — no d3_OS changes needed per project.** The same
`scripts/fetch-pinned-repos.mjs` sync that powers the Project Explorer also checks every pinned repo for a
`firmware/manifest.json` on its default branch (GitHub's GraphQL API can read a file's contents directly, so this
costs no extra API calls). If it finds one and it looks like a valid `esp-web-tools` manifest (has a `builds` array),
that project automatically shows up in the Web Flasher — pulled via `raw.githubusercontent.com`, which serves repo
files with CORS already enabled, so no GitHub Pages or release setup is required.

To make a pinned project flashable:

1. Build your firmware and write an `esp-web-tools` manifest (see its
   [docs](https://esphome.github.io/esp-web-tools/) for the format — `name`, `version`, and a `builds` array of
   `{ chipFamily, parts: [{ path, offset }] }`).
2. Commit the manifest to `firmware/manifest.json` in the repo, alongside the `.bin` file(s) it references by
   relative path (e.g. `firmware/esp32s3.bin`), and push to the default branch.
3. Wait for the next sync (every push to `d3_os`'s `main`, `workflow_dispatch`, or the daily cron — see "Pinned Repos
   Sync" above), or run `npm run fetch:pinned` locally to check sooner.

The Project Explorer's **FLASH** shortcut on that project's card deep-links straight into this app.

For anything that can't be pinned on GitHub, or whose manifest lives elsewhere, add a manual entry to
`src/config/flashTargets.ts` instead — entries there are skipped automatically if their `id` matches an
auto-discovered project, so nothing ever shows up twice.

## 🎨 Design System

### Color Palette

- **Neon Green**: `#00ff41` - Primary accent
- **Neon Blue**: `#00d4ff` - Secondary accent
- **Neon Pink**: `#ff0055` - Danger/alerts
- **Cyber Yellow**: `#FCEE0C` - Highlights
- **Void**: `#050505` - Background

### Typography

- **Monospace**: JetBrains Mono
- **Sans-serif**: Inter

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 👨‍💻 Author

**d3FRAG Networks**

- Website: [d3frag.net](https://d3frag.net)
- GitHub: [@d3mocide](https://github.com/d3mocide)

## 🙏 Acknowledgments

- Inspired by classic terminal UIs and text-mode computing
- The `matrix` easter egg is a nod to The Matrix (1999)
- Block lettering in the style of figlet's "ANSI Shadow" font
- Built with modern web technologies

---

**[SYSTEM ONLINE]** - d3FRAG NETWORKS © 2026
