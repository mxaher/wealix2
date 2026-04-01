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
  // Hardcoded production key to force the correct instance
  const publishableKey = "pk_live_Y2xlcmsud2VhbGl4LmFwcCQ";

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground font-sans"
      >
        <ClerkProvider
          publishableKey={publishableKey}
          signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "https://accounts.wealix.app/sign-in"}
          signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "https://accounts.wealix.app/sign-up"}
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
