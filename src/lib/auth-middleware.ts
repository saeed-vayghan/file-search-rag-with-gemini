import connectToDatabase from "@/lib/db";
import { getAuthenticatedUser } from "./auth-helpers";
import type { IUser } from "@/models/User";
import { PATHS, LOG_MESSAGES } from "@/config/constants";

/**
 * Higher-order function to wrap server actions with authentication.
 */
export function withAuth<TArgs extends any[], TReturn>(
    handler: (user: IUser, ...args: TArgs) => Promise<TReturn>
) {
    return async (...args: TArgs): Promise<TReturn | { error: string }> => {
        try {
            await connectToDatabase();
            const user = await getAuthenticatedUser();

            if (!user) {
                const { redirect } = await import("next/navigation");
                redirect(PATHS.AUTH_SIGNIN);
            }

            return await handler(user!, ...args);
        } catch (error) {
            console.error(LOG_MESSAGES.AUTH.ACTION_FAILED, error);
            // Default error shape if possible, but TReturn might be strict.
            // For now, we rely on the action's return type signature including { error: string }
            // or we rethrow if it's a critical system error.
            // Safest bet for now is to return a generic error object if the signature allows,
            // or rethrow. Given the mixed return types, simple rethrow or specific handling is tricky.
            // Let's stick to just connecting DB and Auth first to avoid breaking changes.
            throw error;
        }
    };
}

/**
 * Optional variant that allows nullable user (doesn't throw error).
 * Useful for actions that work differently for authenticated vs non-authenticated users.
 */
export function withOptionalAuth<TArgs extends any[], TReturn>(
    handler: (user: IUser | null, ...args: TArgs) => Promise<TReturn>
) {
    return async (...args: TArgs): Promise<TReturn> => {
        await connectToDatabase();
        const user = await getAuthenticatedUser();
        return handler(user, ...args);
    };
}
