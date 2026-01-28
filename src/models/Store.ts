import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStore extends Document {
    userId: mongoose.Types.ObjectId;
    googleStoreId: string;
    displayName: string;
    sizeBytes: number;
    fileCount: number;
    status: "ACTIVE" | "PROCESSING" | "DELETED";
    lastSyncedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const StoreSchema: Schema<IStore> = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        googleStoreId: { type: String, required: true, unique: true },
        displayName: { type: String, required: true },
        sizeBytes: { type: Number, default: 0 },
        fileCount: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ["ACTIVE", "PROCESSING", "DELETED"],
            default: "ACTIVE"
        },
        lastSyncedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const Store: Model<IStore> =
    mongoose.models.Store || mongoose.model<IStore>("Store", StoreSchema);

export default Store;
