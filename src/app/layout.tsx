import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Tajawal } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: "WealthOS - ثروتي | Personal Wealth Operating System",
  description: "Track net worth, manage investment portfolios, plan FIRE, and receive AI-powered financial guidance. Designed for Saudi and MENA market with Arabic/English support.",
  keywords: ["Wealth", "Net Worth", "Portfolio", "FIRE", "TASI", "EGX", "Saudi", "MENA", "Finance", "Investment"],
  authors: [{ name: "WealthOS Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "WealthOS - ثروتي",
    description: "Personal Wealth Operating System for Saudi and MENA",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${tajawal.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
