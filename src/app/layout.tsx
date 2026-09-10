import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://berrypink-showcase.vercel.app'),
  title: {
    default: 'Berrypink | อาณาจักรของเล่น & Sylvanian Families ทั้งมือ 1 และมือ 2',
    template: '%s | Berrypink',
  },
  description:
    'พื้นที่สำหรับคนรักของเล่น คัดสรรความน่ารักทั้งของแท้มือหนึ่งและมือสองสภาพสวย Sylvanian Families ของจิ๋ว ชุดเซ็ต บ้าน เสื้อผ้า พร้อมบริการรับซื้อ-รับขาย สั่งซื้อง่ายๆ ทักแชทได้ทันที',
  keywords: [
    'Berrypink',
    'Sylvanian Families',
    'ซิลวาเนียน',
    'ของเล่นมือสอง',
    'ของเล่นของสะสม',
    'ของจิ๋ว',
    'บ้านตุ๊กตา',
    'ชุดเซ็ตซิลวาเนียน',
    'เสื้อผ้าซิลวาเนียน',
  ],
  icons: {
    icon: '/logo.jpg',
    shortcut: '/logo.jpg',
    apple: '/logo.jpg',
  },
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    url: 'https://berrypink-showcase.vercel.app',
    siteName: 'Berrypink Showcase',
    title: 'Berrypink | อาณาจักรของเล่น & Sylvanian Families ทั้งมือ 1 และมือ 2',
    description:
      'พื้นที่สำหรับคนรักของเล่น คัดสรรความน่ารักทั้งของแท้มือหนึ่งและมือสองสภาพสวย Sylvanian Families ของจิ๋ว ชุดเซ็ต บ้าน เสื้อผ้า พร้อมบริการรับซื้อ-รับขาย สั่งซื้อง่ายๆ ทักแชทได้ทันที',
    images: [
      {
        url: 'https://berrypink-showcase.vercel.app/logo.jpg',
        width: 1024,
        height: 434,
        alt: 'Berrypink - อาณาจักรของเล่น & Sylvanian Families',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Berrypink | อาณาจักรของเล่น & Sylvanian Families ทั้งมือ 1 และมือ 2',
    description:
      'พื้นที่สำหรับคนรักของเล่น คัดสรรความน่ารักทั้งของแท้มือหนึ่งและมือสองสภาพสวย Sylvanian Families ของจิ๋ว ชุดเซ็ต บ้าน เสื้อผ้า พร้อมบริการรับซื้อ-รับขาย สั่งซื้อง่ายๆ ทักแชทได้ทันที',
    images: ['https://berrypink-showcase.vercel.app/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full">
      <body className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
