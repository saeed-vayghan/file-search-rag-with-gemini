"use server";

import { GoogleGenAI } from "@google/genai";
import vm from "vm";
import { withAuth } from "@/lib/auth";
import { MESSAGES, LOG_MESSAGES } from "@/config/constants";

if (!process.env.GOOGLE_API_KEY) {
    throw new Error(MESSAGES.ERRORS.GOOGLE_API_KEY_MISSING);
}

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });


export interface PlaygroundResult {
    success: boolean;
    output?: any;
    logs: string[];
    error?: string;
    durationMs: number;
}


export const executePlaygroundCode = withAuth(async (user, code: string): Promise<PlaygroundResult> => {
    const logs: string[] = [];
    const startTime = Date.now();

    // 1. Create a custom console to capture logs
    const sandboxConsole = {
        log: (...args: any[]) => logs.push(args.map(a =>
            typeof a === 'object' ? JSON.stringify(a) : String(a)
        ).join(" ")),
        error: (...args: any[]) => logs.push("[ERROR] " + args.map(a => String(a)).join(" ")),
        warn: (...args: any[]) => logs.push("[WARN] " + args.map(a => String(a)).join(" ")),
    };

    // 2. Wrap code in an async IFFE to allow top-level await
    const wrappedCode = `
        (async () => {
            try {
                ${code}
            } catch (e) {
                throw e;
            }
        })()
    `;

    // 3. Create Context
    const context = vm.createContext({
        ai: ai,
        console: sandboxConsole,
        process: undefined, // Sandbox: remove process access
        require: undefined, // Sandbox: remove require access
    });

    try {
        // 4. Execute
        const result = await vm.runInContext(wrappedCode, context, {
            timeout: 10000, // 10s Execution Limit
            displayErrors: true,
        });

        // 5. Return success
        return {
            success: true,
            output: result, // result of the last expression (return value)
            logs,
            durationMs: Date.now() - startTime
        };

    } catch (error: any) {
        console.error(LOG_MESSAGES.PLAYGROUND.EXECUTION_ERROR, error);
        return {
            success: false,
            error: error.message || String(error),
            logs,
            durationMs: Date.now() - startTime
        };
    }
});
