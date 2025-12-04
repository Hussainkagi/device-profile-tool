import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "R3 Device Profile",
  description: "Created with Next",
  generator: "r3.app",
  icons: {
    icon: [
      {
        url: "/icons-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icons-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icons.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icons.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
