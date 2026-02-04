import { auth } from "@/lib/auth";
import connectToDatabase from "./db";
import User from "@/models/User";
import type { IUser } from "@/models/User";

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
        throw new Error("Unauthorized: Please sign in to continue");
    }

    return user;
}
