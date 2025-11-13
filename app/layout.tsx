import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'render.messesum.com | Secure PDF rendering',
  description: 'High-performance PDF rendering edge ready worker for Messesum builder.',
  metadataBase: new URL('https://render.messesum.com'),
  openGraph: {
    title: 'render.messesum.com',
    description: 'Secure token-aware PDF rendering pipeline',
    url: 'https://render.messesum.com',
    siteName: 'render.messesum.com'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
