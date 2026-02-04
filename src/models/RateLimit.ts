import mongoose, { Schema, Document } from "mongoose";

export interface IRateLimit extends Document {
    key: string;      // Identifier (IP or UserID:Action)
    hits: number;     // Number of requests
    resetAt: Date;    // When the window resets
}

const RateLimitSchema: Schema = new Schema({
    key: { type: String, required: true, unique: true },
    hits: { type: Number, default: 0 },
    resetAt: { type: Date, required: true },
}, { timestamps: true });

// TTL Index: Automatically delete records after resetAt
// This prevents the collection from growing indefinitely
RateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.RateLimit || mongoose.model<IRateLimit>("RateLimit", RateLimitSchema);
