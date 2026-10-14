import { defineConfig } from 'vite';
import { writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
  },
  plugins: [
    {
      name: 'offline-shell',
      closeBundle() {
        const walk = (dir: string): string[] =>
          readdirSync(dir, { withFileTypes: true }).flatMap((f) =>
            f.isDirectory() ? walk(`${dir}/${f.name}`) : [`${dir}/${f.name}`],
          );
        const files = walk('dist')
          .filter((f) => !f.endsWith('/sw.js'))
          .sort();
        const version = createHash('sha256')
          .update(files.map((f) => readFileSync(f)).join(''))
          .digest('hex')
          .slice(0, 12);
        const assets = ['/', ...files.map((f) => '/' + f.slice(5))];
        writeFileSync(
          'dist/sw.js',
          `const CACHE='study-arcana-action-${version}';\nconst ASSETS=${JSON.stringify(assets)};\n` +
            readFileSync('scripts/sw-template.js', 'utf8'),
        );
      },
    },
  ],
});
