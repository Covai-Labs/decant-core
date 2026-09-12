import { defineConfig } from 'astro/config';

// Developer documentation site for decant-core.
// Hosted on GitHub Pages for the Covai-Labs/decant-core repository by building
// into ../docs (the default page branch). PRs preview on covai-labs.github.io/decant-core.
export default defineConfig({
  site: 'https://covai-labs.github.io/decant-core',
  base: '/decant-core',
  outDir: '../docs',
  build: {
    format: 'file',
    inlineStylesheets: 'always',
    emptyOutDir: true,
  },
});
