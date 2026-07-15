// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://worldcup.focustasks.app', // TODO: swap for real domain if different
  output: 'static', // pure static build -> deploy dist/ straight to S3 + CloudFront
  vite: {
    plugins: [tailwindcss()],
  },
});
