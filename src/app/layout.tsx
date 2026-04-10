import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Tajawal } from "next/font/google";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { LocaleSync } from "@/components/layout/LocaleSync";
import { ClerkSync } from "@/components/layout/ClerkSync";
import { RemoteProfileSync } from "@/components/layout/RemoteProfileSync";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wealix.app";

// Static OG image — served directly by Cloudflare Pages as a static asset.
// No edge runtime, no dynamic route, no missing file.
const ogImageUrl = `${siteUrl}/og-default.svg`;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Wealix — AI Wealth OS | Portfolio Tracker & FIRE Planner",
    template: "%s | Wealix",
  },
  description:
    "Track your net worth, analyze your investment portfolio across global markets, and plan financial independence with AI. One calm operating system for personal wealth. Start your 14-day free trial.",
  keywords: [
    "portfolio tracker",
    "FIRE calculator",
    "net worth tracker",
    "AI financial advisor",
    "investment portfolio analysis",
    "financial independence planner",
    "wealth management app",
    "personal finance OS",
    "budget tracker",
    "retirement planner",
    "حاسبة الاستقلال المالي",
    "تتبع المحفظة الاستثمارية",
    "صافي الثروة",
    "مستشار مالي ذكي",
    "تخطيط التقاعد المبكر",
    "إدارة الثروة الشخصية",
    "تتبع الميزانية",
    "تحليل الاستثمار",
  ],
  authors: [{ name: "Wealix Team", url: siteUrl }],
  creator: "Wealix",
  publisher: "Wealix",
  category: "finance",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["ar_SA", "ar_AE", "ar_EG"],
    url: siteUrl,
    siteName: "Wealix",
    title: "Wealix — AI Wealth OS | Portfolio Tracker & FIRE Planner",
    description:
      "Track your net worth, analyze your investment portfolio across global markets, and plan financial independence with AI. One calm operating system for personal wealth.",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Wealix — AI Wealth Operating System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@WealixApp",
    creator: "@WealixApp",
    title: "Wealix — AI Wealth OS | Portfolio Tracker & FIRE Planner",
    description:
      "Track portfolios across global markets. Plan FIRE. Get AI-powered wealth advice. One operating system for your personal wealth.",
    images: [ogImageUrl],
  },
  icons: {
    icon: [
      {
        url: "/favicon.svg?v=20260404c",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
    shortcut: "/favicon.svg?v=20260404c",
    apple: "/wealix-apple-icon.svg?v=20260403a",
  },
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Wealix",
  url: siteUrl,
  description:
    "AI-powered personal wealth OS for MENA investors. Track net worth, portfolios, FIRE, and expenses in Arabic and English.",
  inLanguage: ["en", "ar"],
  publisher: {
    "@type": "Organization",
    name: "Wealix",
    url: siteUrl,
    logo: `${siteUrl}/brand/wealix-mark.svg`,
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Wealix",
  url: siteUrl,
  logo: `${siteUrl}/brand/wealix-mark.svg`,
  sameAs: ["https://x.com/WealixApp"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${tajawal.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className="antialiased bg-background text-foreground font-sans">
        <ClerkProvider
          publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          afterSignOutUrl="/"
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <LocaleSync />
            <ClerkSync />
            <RemoteProfileSync />
            {children}
            <Toaster />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
