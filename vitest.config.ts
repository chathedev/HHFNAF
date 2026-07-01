// TODO: install dev dependencies before this config can be used:
//   npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
//
// Then add to package.json "scripts":
//   "test": "vitest run",
//   "test:watch": "vitest"
//
// Why Vitest over Jest for this project:
// - Native ESM + TypeScript support with zero babel/ts-jest transform config —
//   this repo uses "moduleResolution": "bundler" and Next.js 16 / React 19,
//   which Jest's CJS-first transform pipeline fights with (extra babel-jest /
//   ts-jest config, moduleNameMapper hacks for "@/*").
// - Vitest reuses the Vite/esbuild transform pipeline, so it is fast and needs
//   very little config beyond this file — good fit given there is currently
//   ZERO test infra in the repo and we want the smallest possible first step.
// - The existing (currently non-runnable) tests in lib/__tests__/*.test.ts already
//   import from 'vitest' (describe/it/expect/vi), so adopting Vitest requires no
//   rewrites — adopting Jest instead would require touching all 6 files.
// - Built-in vi.useFakeTimers()/vi.stubGlobal()/vi.mocked() cover everything the
//   existing match-state-manager and get-matches tests already rely on.

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['lib/**/*.test.ts', 'components/**/*.test.tsx', 'hooks/**/*.test.ts', 'app/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
