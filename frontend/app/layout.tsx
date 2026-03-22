import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://digital-stylist-mvp.vercel.app';

export const metadata: Metadata = {
  title: "DigitalStylist — Ton look parfait en 30 secondes chaque matin",
  description: "Ton styliste IA francophone. Il analyse ta garde-robe, regarde la météo, et te dit quoi porter ce matin. Gratuit, sans effort, sans stress.",
  keywords: [
    "styliste IA", "tenue du jour", "look du jour", "garde-robe IA",
    "conseil mode IA", "application mode", "tenue météo",
    "personal stylist IA", "garde-robe capsule", "mode intelligence artificielle",
  ],
  authors: [{ name: "Digital Stylist" }],
  manifest: "/manifest.json",
  metadataBase: new URL(APP_URL),
  alternates: { canonical: APP_URL },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DigitalStylist",
  },
  icons: {
    apple: '/icon-192.png',
  },
  openGraph: {
    title: "DigitalStylist — Ton look parfait en 30 secondes",
    description: "Fini le stress du matin. Ton styliste IA analyse ta garde-robe, regarde la météo, et te dit quoi porter. Gratuit, francophone.",
    type: "website",
    locale: "fr_FR",
    siteName: "DigitalStylist",
    url: APP_URL,
    images: [{
      url: `${APP_URL}/opengraph-image`,
      width: 1200,
      height: 630,
      alt: "DigitalStylist — Ton styliste IA personnel",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DigitalStylist — Ton look parfait en 30 secondes",
    description: "Fini le stress du matin. L'IA analyse ta garde-robe + météo et te dit quoi porter. Gratuit.",
    images: [`${APP_URL}/opengraph-image`],
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
        <ServiceWorkerRegistration />
        <PWAInstallPrompt />
        {children}
      </body>
    </html>
  );
}
