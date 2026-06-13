import type { Metadata } from 'next';
import { Fraunces, Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

/** Display serif co ca tinh (editorial). Optical sizing + italic cho diem nhan. */
const fraunces = Fraunces({
  subsets: ['latin', 'vietnamese'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

/** Than chu hien dai, ho tro tieng Viet chuan. */
const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-bvp',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Mega Shop', template: '%s · Mega Shop' },
  description: 'Cửa hàng trực tuyến — Next.js 15 + Supabase + VNPay',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${fraunces.variable} ${beVietnam.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
