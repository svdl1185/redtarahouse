import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Red Tara Sanctuary | Catskill Lodge",
  description:
    "Escape to Red Tara Sanctuary — a 4-bedroom luxury lodge in the Catskill Mountains with chef's kitchen, game room, and pond views.",
  alternates: {
    canonical: "https://redtarasanctuary.com/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Tibetan mantra glyphs need this face; next/font subsetting is too limited here */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+Tibetan:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
