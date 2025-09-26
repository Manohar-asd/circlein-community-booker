import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import PageTransition from "@/components/page-transition";
import ThemeToggle from "@/components/theme-toggle";
import "./globals.css";
import Providers from "@/components/providers";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CircleIn - Community Amenities Booking",
  description: "Book and manage community amenities with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          <div className="min-h-dvh flex flex-col">
            <header className="sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
                <div className="flex items-center gap-2 select-none">
                  <div className="size-6 rounded-full bg-slate-900 dark:bg-white" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100">CircleIn</span>
                </div>
                <ThemeToggle />
              </div>
            </header>
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </Providers>
      </body>
    </html>
  );
}
