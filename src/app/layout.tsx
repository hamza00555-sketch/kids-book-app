import type { Metadata, Viewport } from "next";
import { Baloo_Bhaijaan_2 } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

// Rounded, friendly typeface with full Arabic + Latin coverage.
const baloo = Baloo_Bhaijaan_2({
  variable: "--font-baloo",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "هَيّا — افتح كتاباً، افتح عالماً",
  description: "منصة عربية لصناعة كتب أطفال تنبض بالحياة بالواقع المعزّز",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${baloo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col selection:bg-sunshine/60 selection:text-ink">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
