import mongoose, { Schema, Document } from "mongoose";

export interface IUsageLog extends Document {
    userId: mongoose.Types.ObjectId;
    type: "indexing" | "chat";
    totalCost: number;
    currency: string;
    modelName: string;
    tokens: {
        input: number;
        output: number;
        total: number;
    };
    details: {
        tokenCost: number;
        searchCost: number;
        isTier2: boolean;
    };
    meta: {
        searchCount?: number;
        operationName?: string;
    };
    contextId?: string; // fileId or chatId
    createdAt: Date;
}

const UsageLogSchema = new Schema<IUsageLog>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        type: { type: String, enum: ["indexing", "chat"], required: true },
        totalCost: { type: Number, required: true },
        currency: { type: String, default: "USD" },
        modelName: { type: String, required: true },
        tokens: {
            input: { type: Number, default: 0 },
            output: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
        },
        details: {
            tokenCost: { type: Number, default: 0 },
            searchCost: { type: Number, default: 0 },
            isTier2: { type: Boolean, default: false },
        },
        meta: {
            searchCount: { type: Number },
            operationName: { type: String },
        },
        contextId: { type: String },
    },
    { timestamps: true }
);

// Index for aggregation
UsageLogSchema.index({ userId: 1, type: 1, createdAt: -1 });

export default mongoose.models.UsageLog || mongoose.model<IUsageLog>("UsageLog", UsageLogSchema);
