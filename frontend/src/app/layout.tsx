import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dial-In | Espresso Extraction Tracker",
  description: "Weigh each step, see your brew ratio instantly, and log how the shot tasted.",
};

export const viewport: Viewport = {
  themeColor: "#0c0908",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable} dark`}>
      <body className="min-h-dvh font-sans antialiased selection:bg-crema/30 selection:text-milk">
        <div className="backdrop" aria-hidden="true" />
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-28">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
