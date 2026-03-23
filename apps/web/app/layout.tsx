import type { Metadata } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';

import './globals.css';

const heading = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-heading'
});

const body = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body'
});

export const metadata: Metadata = {
  title: 'NexDay Web MVP',
  description: 'Quiet luxury AI planner MVP'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${heading.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
