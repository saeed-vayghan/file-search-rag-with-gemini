import mongoose, { Schema, Document, Model } from "mongoose";
import { CHAT_CONSTANTS } from "@/config/constants";

export interface IUser extends Document {
    email: string;
    name: string;
    image?: string;
    googleId?: string; // Google account unique ID
    emailVerified?: Date; // Email verification timestamp
    lastLogin?: Date; // Track login activity
    primaryStoreId?: mongoose.Types.ObjectId; // Link to the formal Store model
    tier: string; // FREE, TIER_1, TIER_2, TIER_3
    settings?: {
        chatModes?: {
            limited?: { instruction: string; enabled: boolean };
            auxiliary?: { instruction: string; enabled: boolean };
        };
        defaultMode?: "limited" | "auxiliary";
    };
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
    {
        email: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        image: { type: String },
        googleId: { type: String, unique: true, sparse: true }, // OAuth ID
        emailVerified: { type: Date }, // OAuth verification
        lastLogin: { type: Date }, // Track activity
        primaryStoreId: { type: Schema.Types.ObjectId, ref: "Store" }, // Formal relationship
        tier: { type: String, default: "TIER_1" }, // FREE, TIER_1, TIER_2, TIER_3
        settings: {
            chatModes: {
                limited: {
                    instruction: { type: String, default: CHAT_CONSTANTS.MODES.LIMITED.DEFAULT_INSTRUCTION },
                    enabled: { type: Boolean, default: true }
                },
                auxiliary: {
                    instruction: { type: String, default: CHAT_CONSTANTS.MODES.AUXILIARY.DEFAULT_INSTRUCTION },
                    enabled: { type: Boolean, default: true }
                }
            },
            defaultMode: { type: String, enum: ["limited", "auxiliary"], default: "limited" }
        }
    },
    { timestamps: true }
);

const User: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
