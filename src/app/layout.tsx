import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Kookiez Digital Creative",
  description: "Jasa desain grafis — logo, poster, banner, flyer, brosur, dan konsultasi desain.",
  verification: {
    google: "9vWk35WiU9lcLX2T3GBIgP93yzRMy8ozw2X01hbh8lI", 
  },
};

export const viewport: Viewport = {
  themeColor: "#f1f4f8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
