import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mega-system-gamma.vercel.app"),
  title: "Mega System",
  description: "Sistema de gestão da Nova Mega Cadeiras — comercial, cadastros, produção e usinagem integrados.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://mega-system-gamma.vercel.app/",
    siteName: "Mega System",
    title: "Mega System",
    description: "Sistema de gestão da Nova Mega Cadeiras — comercial, cadastros, produção e usinagem integrados.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Mega System — Nova Mega Cadeiras" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mega System",
    description: "Sistema de gestão da Nova Mega Cadeiras — comercial, cadastros, produção e usinagem integrados.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-geist-sans)]">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider delay={200}>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
