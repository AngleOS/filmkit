import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/content";
import "./globals.css";

const description =
  "Your AI agent makes the film. Write a brief; Angle Filmkit builds it from scenes with taste, checks every format, looks at its own frames and renders 16:9, 1:1, 4:5 and 9:16 with sound and captions.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Angle Filmkit: your agent makes the film",
  description,
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Angle Filmkit",
    title: "Angle Filmkit: your agent makes the film",
    description,
    images: [
      {
        url: `${SITE_URL}og.png`,
        width: 1920,
        height: 1080,
        alt: "Angle Filmkit: your agent makes the film.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Angle Filmkit",
    description,
    images: [`${SITE_URL}og.png`],
  },
};

export const viewport: Viewport = { themeColor: "#07120f", colorScheme: "dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
