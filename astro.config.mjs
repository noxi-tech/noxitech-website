// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@astrojs/netlify';
import icon from 'astro-icon';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://noxitech.cloud',
  vite: {
    plugins: [tailwindcss()]
  },
  adapter: netlify(),
  integrations: [icon(), sitemap({
    filter: (page) => page !== 'https://noxitech.cloud/audit' && page !== 'https://noxitech.cloud/audit/'
  })]
});