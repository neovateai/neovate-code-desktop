# neovate-code-desktop

Electron boilerplate with React, TypeScript, Vite, and auto-update support.

## Features

- **Electron 30+** - Latest Electron framework
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast HMR and bundling for renderer
- **electron-builder** - Package for macOS (arm64)
- **electron-updater** - Auto-update from GitHub releases
- **@electron/rebuild** - Native module support

## Project Structure

```
neovate-code-desktop/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # App entry point
│   │   └── preload.ts  # IPC bridge
│   ├── renderer/       # React UI
│   │   ├── App.tsx     # Root component
│   │   ├── main.tsx    # React entry
│   │   ├── index.html  # HTML shell
│   │   └── index.css   # Global styles
│   └── shared/         # Shared types
│       └── types.ts
├── dist/               # Compiled output
├── release/            # Packaged apps
└── package.json
```

## Development

### Install Dependencies

```bash
npm install
```

### Run Development Mode

```bash
npm run dev
```

This runs both main and renderer processes concurrently with hot reload.

### Build for Production

```bash
npm run build
```

Compiles TypeScript and bundles React app.

### Package Application

```bash
npm run package:mac
```

Creates DMG and ZIP installers in `release/` folder.

## Auto-Update Setup

1. Create a GitHub repository (e.g., `neovateai/neovate-code-desktop`)
2. Update `build.publish` in `package.json` with your GitHub username/repo
3. Build and package: `npm run package:mac`
4. Create a GitHub release with a version tag (e.g., `v0.1.0`)
5. Upload the DMG and ZIP files from `release/` folder to the GitHub release
6. Users will receive auto-update notifications on app launch

## Scripts

- `npm run dev` - Start development mode (concurrent main + renderer)
- `npm run dev:main` - Start main process only
- `npm run dev:renderer` - Start renderer dev server only
- `npm run build` - Build both main and renderer
- `npm run build:main` - Compile main process TypeScript
- `npm run build:renderer` - Bundle renderer with Vite
- `npm run package` - Build and package for all platforms
- `npm run package:mac` - Build and package for macOS arm64

## Technology Stack

### Main Process
- **Electron** - Desktop framework
- **TypeScript** - Compiled with tsc
- **electron-updater** - Auto-update functionality

### Renderer Process
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool with HMR
- **CSS** - Basic styling

### Build Tools
- **electron-builder** - Packaging and distribution
- **@electron/rebuild** - Native module compilation
- **TypeScript Compiler** - Main process compilation
- **Vite** - Renderer bundling

## Configuration Files

- `package.json` - Dependencies, scripts, and electron-builder config
- `tsconfig.json` - TypeScript config for renderer (ESNext modules)
- `tsconfig.main.json` - TypeScript config for main (CommonJS)
- `vite.config.ts` - Vite bundler configuration

## Requirements

- Node.js 20.x - 22.x
- npm 9.x+
- macOS (for building macOS apps)

## License

MIT
