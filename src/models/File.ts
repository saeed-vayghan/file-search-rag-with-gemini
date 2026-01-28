import mongoose, { Schema, Document, Model } from "mongoose";

export type FileStatus = "UPLOADING" | "INGESTING" | "ACTIVE" | "FAILED";

export interface IFile extends Document {
    userId: mongoose.Types.ObjectId;
    libraryId?: mongoose.Types.ObjectId;
    displayName: string;
    mimeType: string;
    sizeBytes: number;
    status: FileStatus;

    // Google Cloud References
    googleFileId?: string; // "files/..."
    googleUri?: string;
    googleOperationName?: string; // For polling recovery

    // Local storage for preview
    localPath?: string;

    // Deduplication
    contentHash?: string;

    createdAt: Date;
    updatedAt: Date;
}

const FileSchema: Schema<IFile> = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        libraryId: { type: Schema.Types.ObjectId, ref: "Library" },
        displayName: { type: String, required: true },
        mimeType: { type: String, required: true },
        sizeBytes: { type: Number, required: true },
        status: {
            type: String,
            enum: ["UPLOADING", "INGESTING", "ACTIVE", "FAILED"],
            default: "UPLOADING",
        },
        googleFileId: { type: String },
        googleUri: { type: String },
        googleOperationName: { type: String },
        localPath: { type: String },
        contentHash: { type: String, required: false, index: true },
    },
    { timestamps: true }
);

// Indexes
FileSchema.index({ userId: 1 });
FileSchema.index({ libraryId: 1 });

const File: Model<IFile> =
    mongoose.models.File || mongoose.model<IFile>("File", FileSchema);

export default File;
