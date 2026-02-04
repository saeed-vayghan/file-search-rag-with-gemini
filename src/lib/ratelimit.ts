import RateLimit from "@/models/RateLimit";
import connectToDatabase from "./db";


export interface RateLimitRecord {
    hits: number;
    resetAt: Date;
}

export type RateLimitResult = {
    allowed: boolean;
    hits: number;
    remaining: number;
    resetAt: Date;
};

/**
 * Calculates the next state of a rate limit record based on current time.
 */
export function calculateNextRecord(
    current: RateLimitRecord | null,
    now: Date,
    windowMs: number
): RateLimitRecord {
    if (!current || now > current.resetAt) {
        // Create or reset window
        return {
            hits: 1,
            resetAt: new Date(now.getTime() + windowMs),
        };
    }

    // Increment within existing window
    return {
        ...current,
        hits: current.hits + 1,
    };
}

/**
 * Evaluates if a request is allowed based on a record and limit.
 */
export function evaluateRateLimit(
    record: RateLimitRecord,
    limit: number
) {
    const allowed = record.hits <= limit;
    const remaining = Math.max(0, limit - record.hits);

    return {
        allowed,
        hits: record.hits,
        remaining,
        resetAt: record.resetAt,
    };
}

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

    // 1. Fetch current state (Potential Side Effect)
    const existing = await RateLimit.findOne({ key });

    // 2. Calculate next state (Pure Logic)
    const nextRecord = calculateNextRecord(
        existing ? { hits: existing.hits, resetAt: existing.resetAt } : null,
        now,
        windowMs
    );

    // 3. Persist next state (Side Effect)
    const updated = await RateLimit.findOneAndUpdate(
        { key },
        { $set: nextRecord },
        { upsert: true, new: true }
    );

    // 4. Evaluate and return (Pure Logic)
    return evaluateRateLimit({
        hits: updated.hits,
        resetAt: updated.resetAt
    }, limit);
}
