import NextAuth, { type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import connectToDatabase from "./db";
import User from "@/models/User";
import Store from "@/models/Store";
import { GoogleAIService } from "./google-ai";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Missing Google OAuth credentials in environment variables");
}

export const authOptions: NextAuthConfig = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    scope: "openid email profile",
                },
            },
        }),
    ],

    callbacks: {
        async signIn({ user, account }: any) {
            try {
                await connectToDatabase();

                // Check if user exists
                let dbUser = await User.findOne({ email: user.email });

                if (!dbUser) {
                    // First-time user: Create user record and vector store
                    console.log(`[Auth] New user sign-in: ${user.email}`);

                    // 1. Create User record (without store first)
                    dbUser = await User.create({
                        email: user.email,
                        name: user.name || "User",
                        image: user.image,
                        googleId: account?.providerAccountId,
                        emailVerified: new Date(),
                        lastLogin: new Date(),
                        tier: "TIER_1", // Default tier
                    });

                    // 2. Create Google AI vector store
                    const storeName = `store-${user.email}`;
                    const storeResult = await GoogleAIService.createStore(storeName);

                    if (!storeResult) {
                        // Rollback User creation if Store fails
                        await User.findByIdAndDelete(dbUser._id);
                        throw new Error("Failed to create Google AI store");
                    }

                    // 3. Create Store record in DB (Now we have userId)
                    const storeDoc = await Store.create({
                        userId: dbUser._id,
                        googleStoreId: storeResult,
                        displayName: storeName,
                    });

                    // 4. Link Store to User
                    dbUser.primaryStoreId = storeDoc._id as any;
                    await dbUser.save();

                    console.log(`[Auth] User created: ${dbUser._id}, Store: ${storeDoc._id}`);
                } else {
                    // Existing user: Update OAuth info and last login
                    if (!dbUser.googleId && account?.providerAccountId) {
                        dbUser.googleId = account.providerAccountId;
                    }
                    if (user.image && user.image !== dbUser.image) {
                        dbUser.image = user.image;
                    }
                    dbUser.lastLogin = new Date();
                    await dbUser.save();

                    console.log(`[Auth] User logged in: ${dbUser.email}`);
                }

                return true;
            } catch (error) {
                console.error("[Auth] Sign-in error:", error);
                const { writeFile } = await import("fs/promises");
                await writeFile("auth_error.log", `[${new Date().toISOString()}] ${error}\nDetails: ${JSON.stringify(error, null, 2)}\n`);
                return false;
            }
        },

        async session({ session, token }: any) {
            // Add user ID to session for server-side queries
            if (session.user && token.sub) {
                session.user.id = token.sub;
            }
            return session;
        },

        async jwt({ token, user }: any) {
            // Add user email to JWT on first sign-in
            if (user) {
                token.email = user.email;
            }
            return token;
        },
    },

    pages: {
        signIn: "/auth/signin",
        error: "/auth/error",
    },

    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },

    secret: process.env.NEXTAUTH_SECRET,
};

const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

export { handlers, auth, signIn, signOut };
export default NextAuth(authOptions);
