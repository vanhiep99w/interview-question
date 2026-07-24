import type { ReactNode } from 'react';
import { Provider } from '@/components/provider';
import './globals.css';

export const metadata = {
  title: 'Interview Questions',
  description: 'Bộ câu hỏi phỏng vấn kỹ thuật — JavaScript, React, Node.js, Database, System Design',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
