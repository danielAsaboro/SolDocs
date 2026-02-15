import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToastProvider } from "@/components/ui/Toast";
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-sol-purple focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <ToastProvider>
          <Header />
          <main
            id="main-content"
            className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-8"
          >
            {children}
          </main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
