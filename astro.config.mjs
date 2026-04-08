// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@astrojs/netlify';
import icon from 'astro-icon';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://noxitech.cloud',
  output: 'server',
  vite: {
    // @ts-ignore
    plugins: [tailwindcss()]
  },
  adapter: netlify(),
  integrations: [icon(), sitemap({
    filter: (page) => page !== 'https://noxitech.cloud/vetting' && page !== 'https://noxitech.cloud/vetting/'
  })]
});