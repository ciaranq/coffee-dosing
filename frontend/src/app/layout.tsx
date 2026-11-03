import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { TopBar } from "@/components/TopBar";
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
  applicationName: "Dial-In",
  // iPhone "Add to Home Screen": opens full-screen, with the status bar drawn over the app (TopBar pads for it)
  appleWebApp: { capable: true, title: "Dial-In", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { telephone: false },
  // Next only emits the newer mobile-web-app-capable; iOS has always read the Apple-prefixed one
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  // lets env(safe-area-inset-*) work on iPhones with a notch or home indicator
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      appearance={{
        variables: {
          colorPrimary: "#ee3740",
          colorPrimaryForeground: "#111111",
          colorBackground: "#1a1a1a",
          colorForeground: "#f4efe7",
          colorInput: "#2a2a2a",
          borderRadius: "1rem",
        },
      }}
    >
      <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable} dark`}>
        <body className="h-dvh overflow-hidden font-sans antialiased selection:bg-crema/30 selection:text-milk">
          <div className="backdrop" aria-hidden="true" />
          {/* App shell sized to the visible viewport: top bar and nav stay put, only the middle scrolls. */}
          <div className="mx-auto flex h-dvh w-full max-w-md flex-col">
            <TopBar />
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">{children}</div>
            <BottomNav />
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
