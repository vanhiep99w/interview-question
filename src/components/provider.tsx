'use client';

import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';
import SearchDialog from '@/components/search';
import { SourceExplorerProvider } from '@/components/source-explorer/provider';

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider search={{ SearchDialog }}>
      <SourceExplorerProvider>{children}</SourceExplorerProvider>
    </RootProvider>
  );
}
