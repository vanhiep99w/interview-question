import { defineDocs, defineConfig, frontmatterSchema } from 'fumadocs-mdx/config';
import { z } from 'zod';
import { remarkD2 } from '@vanhiep99w/docs-kit/d2';
import { remarkTerminalSession } from '@vanhiep99w/docs-kit/terminal-session';
import { remarkCodeDiff } from '@vanhiep99w/docs-kit/code-diff';
import { remarkProtocolExchange } from '@vanhiep99w/docs-kit/protocol-exchange';
import { remarkSpanWaterfall } from '@vanhiep99w/docs-kit/span-waterfall';
import { remarkCodeWalkthrough } from '@vanhiep99w/docs-kit/code-walkthrough';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: frontmatterSchema.extend({
      d2Layout: z.enum(['elk', 'dagre', 'tala']).optional(),
    }),
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [
      [remarkD2, {
        cacheDir: '.next/cache/docs-kit/d2',
        assetsRoot: 'content/diagrams/assets',
        defaultCaption: 'Sơ đồ',
        interactive: true,
        concurrency: 1,
      }],
      remarkTerminalSession,
      remarkCodeDiff,
      remarkProtocolExchange,
      remarkSpanWaterfall,
      remarkCodeWalkthrough,
    ],
  },
});
