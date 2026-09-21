import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "حساب سرمایه‌گذاران",
  description: "مدیریت سرمایهٔ شرکا بر پایهٔ وزن شمش آلومینیوم",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f8fa",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        {/* استایل برنامه — شامل فونت وزیرمتن به صورت جاسازی‌شده */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/app.css?v=r10" />
      </head>
      <body>{children}</body>
    </html>
  );
}