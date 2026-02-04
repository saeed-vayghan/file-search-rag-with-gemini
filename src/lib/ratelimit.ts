import RateLimit from "@/models/RateLimit";
import connectToDatabase from "./db";

export type RateLimitResult = {
    allowed: boolean;
    hits: number;
    remaining: number;
    resetAt: Date;
};

/**
 * Checks and increments the rate limit for a given key.
 * 
 * @param key - Unique identifier (e.g., userId:chat or userIp:global)
 * @param limit - Maximum number of hits allowed 
 * @param windowMs - Time window in milliseconds
 * @returns RateLimitResult
 */
export async function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
): Promise<RateLimitResult> {
    await connectToDatabase();

    const now = new Date();

    // Atomically find and update or create
    let record = await RateLimit.findOne({ key });

    if (!record || now > record.resetAt) {
        // Create new window
        const resetAt = new Date(now.getTime() + windowMs);
        record = await RateLimit.findOneAndUpdate(
            { key },
            {
                $set: { hits: 1, resetAt },
            },
            { upsert: true, new: true }
        );
    } else {
        // Increment within window
        record = await RateLimit.findOneAndUpdate(
            { key },
            { $inc: { hits: 1 } },
            { new: true }
        );
    }

    const hits = record.hits;
    const allowed = hits <= limit;
    const remaining = Math.max(0, limit - hits);

    return {
        allowed,
        hits,
        remaining,
        resetAt: record.resetAt,
    };
}
