import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Kookiez Digital Creative",
  description: "Jasa desain grafis — logo, poster, banner, flyer, brosur, dan konsultasi desain.",
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
