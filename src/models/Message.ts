import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
    fileId?: mongoose.Types.ObjectId;
    libraryId?: mongoose.Types.ObjectId;
    scope: "file" | "library" | "global";
    role: "user" | "assistant";
    content: string;
    citations?: { id: number; uri?: string; title?: string }[];
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
        scope: {
            type: String,
            enum: ["file", "library", "global"],
            default: "file",
            required: true,
        },
        role: {
            type: String,
            enum: ["user", "assistant"],
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
    },
    { timestamps: true }
);

export default mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
