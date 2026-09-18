# d3FRAG // d3_OS

> A cyberpunk web operating system built with React. Experience the future of retro computing.

![d3FRAG Networks](https://img.shields.io/badge/d3FRAG-NETWORKS-00ff41?style=for-the-badge)
![Status](https://img.shields.io/badge/STATUS-ONLINE-00ff41?style=for-the-badge)

## 🌐 Overview

**d3_OS** is an immersive, browser-based operating system that brings the cyberpunk aesthetic to life. Built with modern web technologies, it features a fully functional window management system, integrated applications, and a retro-futuristic terminal interface.

### ✨ Features

- 🪟 **Window Management** - Draggable, resizable windows with z-index stacking
- 💻 **Terminal Application** - Interactive command-line interface with easter eggs
- 📁 **Project Explorer** - Portfolio showcase, live-synced with your pinned GitHub repos
- ⚡ **Web Flasher** - Flash firmware to SBCs/microcontrollers over USB via Web Serial
- 🌐 **Integrated Browser** - Iframe-based web browser within the OS
- 🎨 **Cyberpunk Aesthetics** - Matrix rain, scanlines, glitch effects, neon colors
- 🔊 **Audio System** - Immersive sound effects for interactions
- 🎯 **Start Menu** - Application launcher with system controls
- ⚡ **Shutdown/Logout** - CRT-off animation and session management

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
- **Audio**: Howler.js
- **Containerization**: Docker

## 📁 Project Structure

```
d3_os/
├── src/
│   ├── components/
│   │   ├── apps/          # Application components
│   │   ├── os/             # OS shell components
│   │   └── fx/             # Visual effects
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

- `help` - Display available commands
- `list` - Show installed applications
- `projects` - Launch Project Explorer
- `flasher` - Launch Web Flasher
- `clear` - Clear terminal output
- `whoami` - Display system information
- `matrix` - Enable Matrix mode
- `sudo` - Try it and see 😉

### Applications

- **D3_TERM** - Interactive terminal
- **PROJECT_EXPLORER** - Portfolio browser, live-synced with pinned GitHub repos
- **WEB_FLASHER** - Flash firmware to SBCs/microcontrollers over USB
- **BROWSER** - Integrated web browser

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

Flashable projects are config-driven in `src/config/flashTargets.ts`. To add one:

1. Build and publish your firmware binaries plus a `manifest.json` (the format `esp-web-tools` expects — see its
   [docs](https://esphome.github.io/esp-web-tools/)) somewhere with permissive CORS, such as the project's own GitHub
   Pages site, a GitHub Release asset, or this repo's `public/firmware/<project>/`.
2. Add an entry to `flashTargets` with the project name, board, and `manifestUrl`.
3. Optionally tag the project's GitHub repo with the `web-flasher` topic — the Project Explorer app picks that up
   automatically and shows a **FLASH** shortcut on the matching project card that deep-links into this app.

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

- Inspired by classic terminal UIs and cyberpunk aesthetics
- Matrix rain effect inspired by The Matrix (1999)
- Built with modern web technologies

---

**[SYSTEM ONLINE]** - d3FRAG NETWORKS © 2026
