import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import AuthProvider from "@/components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CheetCode | Firecrawl Agent Challenge",
  description:
    "Build an AI agent that navigates the web, extracts data, and solves challenges against the clock. A Firecrawl recruiting challenge.",
  openGraph: {
    title: "CheetCode | Firecrawl Agent Challenge",
    description:
      "Build an AI agent that navigates the web, extracts data, and solves challenges against the clock.",
    siteName: "CheetCode",
  },
  twitter: {
    card: "summary_large_image",
    title: "CheetCode | Firecrawl Agent Challenge",
    description:
      "Build an AI agent that navigates the web, extracts data, and solves challenges against the clock.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
