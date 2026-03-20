import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Digital Stylist — Votre styliste IA personnel",
  description: "Analysez vos vêtements, recevez des suggestions personnalisées et construisez votre style idéal avec l'intelligence artificielle.",
  keywords: ["styliste IA", "mode", "garde-robe", "tenues", "conseils mode", "personal stylist"],
  authors: [{ name: "Digital Stylist" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DigitalStylist",
  },
  openGraph: {
    title: "Digital Stylist — Votre styliste IA personnel",
    description: "Analysez vos vêtements et recevez des suggestions de tenues personnalisées grâce à l'IA.",
    type: "website",
    locale: "fr_FR",
    siteName: "Digital Stylist",
  },
  twitter: {
    card: "summary_large_image",
    title: "Digital Stylist — Styliste IA personnel",
    description: "Analysez votre garde-robe et recevez des conseils mode personnalisés.",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
