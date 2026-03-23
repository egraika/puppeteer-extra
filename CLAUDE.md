# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

This is a Lerna monorepo with yarn workspaces and independent versioning.

```bash
# Initial setup
yarn
yarn bootstrap          # Install deps and link cross-dependencies
yarn build              # Build all TypeScript packages

# Testing
yarn test               # Run all package tests (serial, via lerna)
cd packages/<name> && yarn test          # Test a single package
cd packages/<name> && yarn ava -v ./path/to/file.test.js  # Run a single test file

# TypeScript packages have separate test scripts:
yarn test:ts            # ava with ts-node (ava.config-ts.js)
yarn test:js            # ava serial mode

# Publishing
yarn lerna publish      # Publish changed packages (uses npm client)
```

## Architecture

### Monorepo Layout

All packages live under `packages/`. Two core packages provide the framework; everything else is a plugin or companion tool.

### Core Packages

- **puppeteer-extra** — Drop-in replacement for puppeteer. Wraps vanilla Puppeteer, coordinates plugin lifecycle. Main class: `PuppeteerExtra`. Key method: `.use(plugin)`.
- **puppeteer-extra-plugin** — Abstract base class `PuppeteerExtraPlugin` that all plugins extend. Defines lifecycle hooks.

### Plugin Lifecycle Hooks (in execution order)

`beforeLaunch` → `afterLaunch` → `onBrowser` → `onPageCreated` → `onTargetCreated` / `onTargetChanged` / `onTargetDestroyed` → `onDisconnected` / `onClose`

For `connect()` flow: `beforeConnect` → `afterConnect` instead of launch hooks.

Plugins declare metadata via properties: `name`, `defaults`, `dependencies` (Set), `requirements` (Set: `'launch'`, `'headful'`, `'dataFromPlugins'`, `'runLast'`).

### Package Types

**TypeScript packages** (puppeteer-extra, puppeteer-extra-plugin, stealth, adblocker, recaptcha, playwright-extra):
- Source in `src/`, built via Rollup + TypeScript to `dist/`
- Dual output: `dist/index.cjs.js` (CommonJS) + `dist/index.esm.js` (ES modules) + `dist/index.d.ts`
- Build: `yarn build` runs `build:tsc` then `build:rollup`

**JavaScript packages** (anonymize-ua, block-resources, user-data-dir, etc.):
- Source is `index.js` directly, no build step

### Stealth Plugin Structure

`puppeteer-extra-plugin-stealth` has 18+ evasion techniques, each in its own subdirectory under `evasions/`. Each evasion has `index.js`, `index.test.js`, and `index.d.ts`.

### Companion Packages

- **playwright-extra** — Same plugin framework adapted for Playwright
- **@extra/proxy-router** — Dynamic proxy routing for both frameworks
- **extract-stealth-evasions** — CLI to extract/minify stealth evasions

## Testing

- Framework: **ava** (v2.4.0)
- File pattern: `*.test.ts` or `*.test.js` (not `.spec`)
- Integration tests launch real browsers — run serially to avoid race conditions
- Test helpers in `packages/puppeteer-extra-plugin-stealth/test/util.js`: `vanillaPuppeteer`, `addExtra()`
- Debug: `DEBUG=puppeteer-extra,puppeteer-extra-plugin:*`

## Code Style

- ESLint extends `prettier-standard` (standard.js + prettier)
- Prettier: no semicolons, single quotes, 80 char width, LF line endings
- `"lines-between-class-members": "off"`
