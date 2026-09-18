# d3FRAG // d3_OS

> A cyberpunk web operating system built with React. Experience the future of retro computing.

![d3FRAG Networks](https://img.shields.io/badge/d3FRAG-NETWORKS-00ff41?style=for-the-badge)
![Status](https://img.shields.io/badge/STATUS-ONLINE-00ff41?style=for-the-badge)

## 🌐 Overview

**d3_OS** is an immersive, browser-based operating system that brings the cyberpunk aesthetic to life. Built with modern web technologies, it features a fully functional window management system, integrated applications, and a retro-futuristic terminal interface.

### ✨ Features

- 🪟 **Window Management** - Draggable, resizable windows with z-index stacking
- 💻 **Terminal Application** - Interactive command-line interface with easter eggs
- 📁 **Project Explorer** - Portfolio showcase with live deployment links
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
│   │   ├── os/            # OS shell components
│   │   └── fx/            # Visual effects
│   ├── store/             # Zustand state management
│   ├── hooks/             # Custom React hooks
│   └── assets/            # Static assets
├── public/                # Public assets
├── Dockerfile             # Docker configuration (local dev)
└── docker-compose.dev.yml # Docker Compose setup (local dev)
```

## 🎮 Usage

### Terminal Commands

- `help` - Display available commands
- `list` - Show installed applications
- `clear` - Clear terminal output
- `whoami` - Display system information
- `matrix` - Enable Matrix mode
- `sudo` - Try it and see 😉

### Applications

- **D3_TERM** - Interactive terminal
- **PROJECT_EXPLORER** - Portfolio browser
- **BROWSER** - Integrated web browser

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
