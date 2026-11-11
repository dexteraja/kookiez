import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import AuthProvider from "@/components/AuthProvider";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Kookiez Digital Creative",
    template: "%s | Kookiez.",
  },
  description: "Jasa desain grafis untuk logo, poster, banner, flyer, brosur, dan konsultasi desain.",
  applicationName: "Kookiez.",
  openGraph: {
    title: "Kookiez Digital Creative",
    description: "Jasa desain grafis untuk brand, bisnis, dan kebutuhan visual kamu.",
    type: "website",
    siteName: "Kookiez.",
  },
  verification: {
    google: "9vWk35WiU9lcLX2T3GBIgP93yzRMy8ozw2X01hbh8lI",
  },
};

export const viewport: Viewport = {
  themeColor: "#f3f1ea",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-sans">
        <AuthProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
