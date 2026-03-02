import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.integration.test.ts', 'node_modules/**'],
          environment: 'node',
          globals: true,
        },
      },
      {
        test: {
          name: 'integration',
          include: ['src/tests/integration/**/*.integration.test.ts'],
          environment: 'node',
          globals: true,
          setupFiles: ['./src/tests/integration/setup/envSetup.ts'],
          testTimeout: 30000,
          hookTimeout: 30000,
          // forks is required so that each worker is a fresh process. This guarantees
          // that setupFiles (envSetup.ts) runs and sets process.env BEFORE index.ts is
          // imported, which calls requireEnv() at module load time. Switching to
          // 'threads' would cause config.ts to throw before envSetup.ts executes.
          pool: 'forks',
        },
      },
    ],
  },
})
