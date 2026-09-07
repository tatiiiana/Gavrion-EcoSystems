import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import './motion.css';
import './tables.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'EcoNexo | Gestión empresarial de reciclables',
  description: 'Inventario, compras, ventas y abastecimiento de materiales reciclables.',
  openGraph: {
    title: 'EcoNexo Reciclajes',
    description: 'Inventario, compras, ventas y abastecimiento en un solo lugar.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'EcoNexo Reciclajes' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EcoNexo Reciclajes',
    description: 'Inventario, compras, ventas y abastecimiento en un solo lugar.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
