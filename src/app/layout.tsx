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
        url: 'https://images.unsplash.com/photo-1558877385-81a1c7e67d72?q=80&w=1200&auto=format&fit=crop',
        width: 1200,
        height: 630,
        alt: 'Berrypink Toy & Sylvanian Families Store',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Berrypink | อาณาจักรของเล่น & Sylvanian Families ทั้งมือ 1 และมือ 2',
    description:
      'พื้นที่สำหรับคนรักของเล่น คัดสรรความน่ารักทั้งของแท้มือหนึ่งและมือสองสภาพสวย Sylvanian Families ของจิ๋ว ชุดเซ็ต บ้าน เสื้อผ้า พร้อมบริการรับซื้อ-รับขาย สั่งซื้อง่ายๆ ทักแชทได้ทันที',
    images: ['https://images.unsplash.com/photo-1558877385-81a1c7e67d72?q=80&w=1200&auto=format&fit=crop'],
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
