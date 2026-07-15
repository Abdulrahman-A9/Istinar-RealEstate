import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "استنار العقارية | قرارات أوضح للأرض والفرصة",
  description: "منصة استنار لإدارة المخططات التفاعلية وقياس الطلب وفهم الفرص العقارية.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
