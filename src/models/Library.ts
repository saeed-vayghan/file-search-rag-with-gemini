import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILibrary extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    createdAt: Date;
    updatedAt: Date;
}

const LibrarySchema: Schema<ILibrary> = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        description: { type: String },
        icon: { type: String, default: "📁" },
        color: { type: String, default: "text-slate-500" },
    },
    { timestamps: true }
);

// Index for quick lookup by user
LibrarySchema.index({ userId: 1 });

const Library: Model<ILibrary> =
    mongoose.models.Library ||
    mongoose.model<ILibrary>("Library", LibrarySchema);

export default Library;
