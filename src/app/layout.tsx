import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { LocaleSync } from "@/components/layout/LocaleSync";
import { ClerkSync } from "@/components/layout/ClerkSync";
import { RemoteProfileSync } from "@/components/layout/RemoteProfileSync";

export const metadata: Metadata = {
  title: "Wealix App",
  description: "Personal Wealth Operating System",
  keywords: ["Wealth", "Net Worth", "Portfolio", "FIRE", "TASI", "EGX", "Saudi", "MENA", "Finance", "Investment"],
  authors: [{ name: "Wealix Team" }],
  icons: {
    icon: [
      { url: "/brand/logo-fav-icon.png?v=20260331a", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/brand/logo-fav-icon.png?v=20260331a",
    apple: "/brand/logo-fav-icon.png?v=20260331a",
  },
  openGraph: {
    title: "Wealix App",
    description: "Personal Wealth Operating System",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground font-sans"
      >
        <ClerkProvider
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
