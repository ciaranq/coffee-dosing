import { clerkMiddleware } from "@clerk/nextjs/server";

// No routes are protected here on purpose: the wizard and history work signed out (data stays on the device).
// Signing in unlocks saving to the account. The server action verifies the session with auth().
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
