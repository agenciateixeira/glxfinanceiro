import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Gestão GLX - Gestão Financeira Inteligente",
  description: "Sistema de gestão financeira personalizado para casais",
  manifest: "/manifest.json",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#D4C5B9" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1A1A" },
  ],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GLX",
  },
  applicationName: "GLX",
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Gestão GLX",
    title: "Gestão GLX - Gestão Financeira Inteligente",
    description: "Sistema de gestão financeira personalizado para casais",
  },
  twitter: {
    card: "summary",
    title: "Gestão GLX - Gestão Financeira Inteligente",
    description: "Sistema de gestão financeira personalizado para casais",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/pwa.png" />
        <link rel="apple-touch-startup-image" href="/pwa.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GLX" />
        <meta name="application-name" content="GLX" />
        <meta name="msapplication-TileColor" content="#D4C5B9" />
        <meta name="msapplication-TileImage" content="/pwa.png" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#D4C5B9" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1A1A1A" media="(prefers-color-scheme: dark)" />
      </head>
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
