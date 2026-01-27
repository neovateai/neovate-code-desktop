# Development Commands

## Development Server
- `npm run dev`: Starts Electron and the Vite renderer via electron-vite.
- `npm run preview`: Previews the production build locally.

## Building and Packaging
- `npm run build`: Builds main, preload, and renderer via electron-vite.
- `npm run package`: Packages the application for macOS.
- `npm run package:dev`: Packages the development build for macOS.
- `npm run package:local`: Packages a development build for macOS using the local config.

## Testing and Quality
- `npm test`: Runs unit tests using Vitest.
- `npm run format`: Formats code using Biome.
- `npm run typecheck`: Runs TypeScript type checking without emitting files.

## Release
- `npm run release`: Bumps versions using bumpp.

## Lifecycle
- `preinstall`: Enforces npm as the package manager via only-allow.
- `prepare`: Sets up Husky git hooks.
