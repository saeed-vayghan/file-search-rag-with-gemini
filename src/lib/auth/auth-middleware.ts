import connectToDatabase from "@/lib/db";
import type { IUser } from "@/models/User";
import { PATHS, LOG_MESSAGES, MESSAGES } from "@/config/constants";
import { checkRateLimit } from "../ratelimit";
import { auth } from "./auth";
import User from "@/models/User";


/**
 * Get the authenticated user from the current session.
 * Returns null if not authenticated.
 * Use this in server actions to ensure user is logged in.
 */
export async function getAuthenticatedUser(): Promise<IUser | null> {
    const session = await auth();

    if (!session?.user?.email) {
        return null;
    }

    await connectToDatabase();

    const user = await User.findOne({ email: session.user.email })
        .populate("primaryStoreId");

    return user as IUser | null;
}

/**
 * Require authentication. Throws error if user is not authenticated.
 * Returns the authenticated user.
 */
export async function requireAuth(): Promise<IUser> {
    const user = await getAuthenticatedUser();

    if (!user) {
        throw new Error(MESSAGES.ERRORS.UNAUTHORIZED);
    }

    return user;
}

export type RateLimitOptions = {
    limit: number;
    windowMs: number;
    actionName?: string;
};

export type ActionOptions = {
    rateLimit?: RateLimitOptions;
};

/**
 * Higher-order function to wrap server actions with authentication.
 */
export function withAuth<TArgs extends any[], TReturn>(
    handler: (user: IUser, ...args: TArgs) => Promise<TReturn>,
    options?: ActionOptions
) {
    return async (...args: TArgs): Promise<TReturn | { error: string }> => {
        try {
            await connectToDatabase();
            const user = await getAuthenticatedUser();

            if (!user) {
                const { redirect } = await import("next/navigation");
                redirect(PATHS.AUTH_SIGNIN);
            }

            // Apply Rate Limiting if configured
            if (options?.rateLimit) {
                const key = `user:${user!._id}:${options.rateLimit.actionName || 'default'}`;
                const rl = await checkRateLimit(key, options.rateLimit.limit, options.rateLimit.windowMs);

                if (!rl.allowed) {
                    return { error: MESSAGES.ERRORS.RATE_LIMIT_EXCEEDED || "Too many requests. Please try again later." };
                }
            }

            return await handler(user!, ...args);
        } catch (error) {
            console.error(LOG_MESSAGES.AUTH.ACTION_FAILED, error);
            throw error;
        }
    };
}

/**
 * Optional variant that allows nullable user (doesn't throw error).
 * Useful for actions that work differently for authenticated vs non-authenticated users.
 */
export function withOptionalAuth<TArgs extends any[], TReturn>(
    handler: (user: IUser | null, ...args: TArgs) => Promise<TReturn>,
    options?: ActionOptions
) {
    return async (...args: TArgs): Promise<TReturn | { error: string }> => {
        await connectToDatabase();
        const user = await getAuthenticatedUser();

        // Apply Rate Limiting if configured (uses user ID or fallback to IP)
        if (options?.rateLimit) {
            const identifier = user ? user._id.toString() : "anonymous";
            const key = `opt-user:${identifier}:${options.rateLimit.actionName || 'default'}`;
            const rl = await checkRateLimit(key, options.rateLimit.limit, options.rateLimit.windowMs);

            if (!rl.allowed) {
                return { error: MESSAGES.ERRORS.RATE_LIMIT_EXCEEDED || "Too many requests. Please try again later." };
            }
        }

        return handler(user, ...args) as Promise<TReturn>;
    };
}
