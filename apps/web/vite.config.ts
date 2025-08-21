import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

function getGitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __GIT_COMMIT__: JSON.stringify(getGitCommit()),
  },
  build: {
    target: 'es2018',
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1200,
  },
  esbuild: {
    legalComments: 'none',
  },
});