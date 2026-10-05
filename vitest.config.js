import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Vitest harness for Vendor_Frontend.
 *
 * - Uses the same @vitejs/plugin-react transform as the app build, so JSX
 *   behaviour in tests matches production exactly.
 * - jsdom environment → components can be rendered with React Testing Library.
 * - `.test.js` / `.test.jsx` under tests/ are picked up.
 * - The legacy plain-node `.test.mjs` suites keep running via `npm run test:auth-flow`
 *   (they call process.exit and are not vitest-compatible).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js', 'tests/**/*.test.jsx'],
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/**/*.test.mjs'],
    restoreMocks: true,
  },
});
