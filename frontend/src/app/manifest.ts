import type { MetadataRoute } from "next";

// Lets the app be added to the home screen and open full-screen, without Safari's toolbars.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dial-In: Espresso Extraction Tracker",
    short_name: "Dial-In",
    description: "Weigh each step, see your brew ratio instantly, and log how the shot tasted.",
    start_url: "/dial-in",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#111111",
    theme_color: "#111111",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
