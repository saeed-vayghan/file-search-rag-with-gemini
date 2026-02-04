import { getAuthenticatedUser } from "./auth-helpers";
import type { IUser } from "@/models/User";

/**
 * Higher-order function to wrap server actions with authentication.
 * Automatically checks if user is authenticated and passes user to the handler.
 * 
 * Usage:
 * export const myAction = withAuth(async (user, arg1, arg2) => {
 *   // user is guaranteed to be authenticated here
 *   return { success: true };
 * });
 */
export function withAuth<TArgs extends any[], TReturn>(
    handler: (user: IUser, ...args: TArgs) => Promise<TReturn>
) {
    return async (...args: TArgs): Promise<TReturn | { error: string }> => {
        const user = await getAuthenticatedUser();

        if (!user) {
            const { redirect } = await import("next/navigation");
            redirect("/auth/signin");
        }

        return handler(user!, ...args);
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
        const user = await getAuthenticatedUser();
        return handler(user, ...args);
    };
}
