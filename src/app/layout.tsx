import type { ReactNode } from 'react';
import { Provider } from '@/components/provider';
import './globals.css';

export const metadata = {
  title: 'Interview Questions',
  description: 'Bài học kỹ thuật chuyên sâu — thuật toán, Java, database, web, bảo mật và system design; giải thích cơ chế, ví dụ và trade-off.',
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
