import type { Metadata } from "next";

import Navbar from "../components/Navbar/Navbar";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

import { Providers } from "../app/Providers";

import { Josefin_Sans } from "next/font/google";

const josefinSans = Josefin_Sans({
  subsets: ["latin"],
  variable: "--font-josefin-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DropZone🤑",
  description: "Airdrop On The Way",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${josefinSans.variable} font-sans`}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
