import mongoose, { Schema, Document } from "mongoose";
import { CHAT_SCOPES, CHAT_ROLES, ChatScopeType, ChatRoleType } from "@/config/constants";

export interface IMessage extends Document {
    fileId?: mongoose.Types.ObjectId;
    libraryId?: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId;
    scope: ChatScopeType;
    role: ChatRoleType;
    content: string;
    citations?: { id: number; uri?: string; title?: string }[];


    // Cost
    cost?: number;
    tokens?: number;

    createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
    {
        fileId: {
            type: Schema.Types.ObjectId,
            ref: "File",
            required: false,
            index: true,
        },
        libraryId: {
            type: Schema.Types.ObjectId,
            ref: "Library",
            required: false,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: false, // Optional for backward compatibility/system messages
            index: true,
        },
        scope: {
            type: String,
            enum: Object.values(CHAT_SCOPES),
            default: CHAT_SCOPES.FILE,
            required: true,
        },
        role: {
            type: String,
            enum: Object.values(CHAT_ROLES),
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        citations: [{
            _id: false,
            id: Number,
            uri: String,
            title: String
        }],
        cost: { type: Number },
        tokens: { type: Number },
    },
    { timestamps: true }
);

export default mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
