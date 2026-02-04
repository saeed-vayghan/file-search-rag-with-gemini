import { auth } from "@/lib/auth";
import { NextResponse } from 'next/server';
import { RATE_LIMIT_CONFIG } from "@/config/ratelimit";

// Lightweight IP-based rate limiter for Middleware (Edge compatible)
const memoryCache = new Map<string, { hits: number; resetAt: number }>();

export default auth((req: any) => {
    // 1. IP-based Global Shield
    const ip = req.ip || req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const config = RATE_LIMIT_CONFIG.GLOBAL;

    let record = memoryCache.get(ip);

    if (!record || now > record.resetAt) {
        record = { hits: 1, resetAt: now + config.windowMs };
        memoryCache.set(ip, record);
    } else {
        record.hits += 1;
    }

    if (record.hits > config.limit) {
        return new NextResponse('Too Many Requests', {
            status: 429,
            headers: {
                'Content-Type': 'text/plain',
                'Retry-After': Math.ceil((record.resetAt - now) / 1000).toString(),
            },
        });
    }

    // 2. Fallthrough to Authentication (if needed)
    // The auth() wrapper already handles session checking if config.matcher matches.
    return NextResponse.next();
});

// Protect all routes except auth pages and API routes
// Combine original proxy.ts config with global matcher
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
        "/api/:path*" // Ensure API routes are shielded
    ],
};
