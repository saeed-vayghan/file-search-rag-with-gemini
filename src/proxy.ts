import { auth } from "@/lib/auth";

// Export auth function as default for Next.js middleware
export default auth;

// Protect all routes except auth pages and API routes
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - /auth/* (authentication pages)
         * - /api/auth/* (NextAuth API routes)
         * - /_next/static (static files)
         * - /_next/image (image optimization files)
         * - /favicon.ico (favicon file)
         */
        "/((?!auth|api/auth|_next/static|_next/image|favicon.ico).*)",
    ],
};
