import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "SolDocs - Solana Program Documentation",
  description:
    "AI-generated documentation for Solana programs, powered by Anchor IDL analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <Header />
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
