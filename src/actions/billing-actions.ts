"use server";

import { withAuth } from "@/lib/auth";
import UsageLog from "@/models/UsageLog";
import { MESSAGES } from "@/config/constants";

export const getUsageStatsAction = withAuth(async (user) => {
    try {
        const logs = await UsageLog.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const aggregations = await UsageLog.aggregate([
            { $match: { userId: user._id } },
            {
                $group: {
                    _id: null,
                    totalCost: { $sum: "$totalCost" },
                    totalTokens: { $sum: "$tokens.total" },
                    indexingCost: {
                        $sum: {
                            $cond: [{ $eq: ["$type", "indexing"] }, "$totalCost", 0]
                        }
                    },
                    chatCost: {
                        $sum: {
                            $cond: [{ $eq: ["$type", "chat"] }, "$totalCost", 0]
                        }
                    }
                }
            }
        ]);

        const stats = aggregations[0] || {
            totalCost: 0,
            totalTokens: 0,
            indexingCost: 0,
            chatCost: 0
        };

        // Serialize ObjectIds for client
        const serializedLogs = logs.map(log => ({
            ...log,
            _id: log._id.toString(),
            userId: log.userId.toString(),
            createdAt: log.createdAt.toISOString(),
            updatedAt: log.updatedAt.toISOString(),
        }));

        return {
            ...stats,
            logs: serializedLogs
        };
    } catch (error) {
        console.error("Failed to fetch usage stats:", error);
        return { error: MESSAGES.ERRORS.GENERIC_ERROR };
    }
});
