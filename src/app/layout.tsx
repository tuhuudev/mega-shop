import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

/**
 * Mot ho chu grotesque sach, ho tro tieng Viet chuan.
 * Tham my Scandinavian: weight mong (300) cho tieu de lon, airy.
 */
const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-bvp',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Mega Shop', template: '%s · Mega Shop' },
  description: 'Cửa hàng trực tuyến — Next.js 15 + Supabase + VNPay',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
