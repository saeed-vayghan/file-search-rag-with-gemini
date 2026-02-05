export interface PlaygroundScenario {
    id: string;
    category: 'Files' | 'Stores' | 'Operations';
    name: string;
    description: string;
    code: string;
}

export const PLAYGROUND_SCENARIOS: PlaygroundScenario[] = [
    {
        id: 'list-files',
        category: 'Files',
        name: 'List All Files',
        description: 'List the first 100 files in your project.',
        code: `
// List all files
const response = await ai.files.list({
    pageSize: 10
});

console.log('Listing files');

return response.pageInternal;
`
    },
    {
        id: 'get-file',
        category: 'Files',
        name: 'Get File Metadata',
        description: 'Inspect a specific file by Name (ID).',
        code: `
// Extract file name from list-files response
const fileName = "files/YOUR_FILE_ID"; 

console.log(\`Fetching metadata for \${fileName}...\`);
const file = await ai.files.get({ name: fileName });

return file;
`
    },
    {
        id: 'list-stores',
        category: 'Stores',
        name: 'List Vector Stores',
        description: 'Show all File Search Stores.',
        code: `
console.log("Listing stores...");
const stores = await ai.fileSearchStores.list();

const results = [];
for await (const store of stores) {
    results.push({
        name: store.name,
        displayName: store.displayName,
        fileCount: store.fileCount || 0
    });
}

return results;
`
    },
    {
        id: 'search-store',
        category: 'Stores',
        name: 'RAG Search Probe',
        description: 'Test a semantic search query against a store.',
        code: `
// Extract store name from list-stores response
const storeName = "fileSearchStores/YOUR_STORE_ID";
const query = "What are the main topics?";

console.log(\`Searching in \${storeName}...\`);

// Using structure from GoogleAIService.search
const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", 
    contents: query,
    config: {
        tools: [{
            fileSearch: {
                fileSearchStoreNames: [storeName],
            }
        }]
    }
});

// Parse citations just like existing app
const candidate = response.candidates?.[0];
console.log("Grounding Metadata:", JSON.stringify(candidate?.groundingMetadata, null, 2));

return response.text;
`
    },
    {
        id: 'indexing-cost',
        category: 'Files',
        name: 'File Indexing Cost',
        description: 'Calculate tokens and cost for a specific file URI.',
        code: `
// 1. Specify the file details
const fileUri = "https://generativelanguage.googleapis.com/v1beta/files/YOUR_FILE_ID";
const mimeType = "application/pdf";

console.log(\`Calculating tokens for: \${fileUri}...\`);

// 2. Call countTokens on the specific model
const response = await ai.models.countTokens({
    model: "gemini-embedding-001",
    contents: [{
        parts: [{
            fileData: {
                fileUri: fileUri,
                mimeType: mimeType
            }
        }]
    }]
});

// 3. Extract and calculate ($0.15 per 1M tokens)
const totalTokens = response.totalTokens;
const indexingCost = (totalTokens / 1_000_000) * 0.15;

console.log(\`File Tokens: \${totalTokens}\`);
console.log(\`Estimated Indexing Cost: \$\${indexingCost.toFixed(6)}\`);

return { totalTokens, indexingCost };
`
    },
    {
        id: 'chat-cost',
        category: 'Stores',
        name: 'Chat Consumption Analysis',
        description: 'Analyze token usage and cost for a RAG turn.',
        code: `
const storeName = "fileSearchStores/YOUR_STORE_ID";
const query = "What is this document about?";

console.log(\`Sending RAG query to \${storeName}...\`);

const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: query,
    config: {
        tools: [{
            fileSearch: {
                fileSearchStoreNames: [storeName],
            }
        }]
    }
});

const usage = response.usageMetadata;
console.log("Usage Metadata:", usage);

// Standard Pricing Calculation
const inputCost = (usage.promptTokenCount / 1_000_000) * 0.075; // $0.075/1M
const outputCost = (usage.candidatesTokenCount / 1_000_000) * 0.3; // $0.30/1M
const totalCost = inputCost + outputCost;

console.log(\`Input: \${usage.promptTokenCount} tokens (\$\${inputCost.toFixed(6)})\`);
console.log(\`Output: \${usage.candidatesTokenCount} tokens (\$\${outputCost.toFixed(6)})\`);
console.log(\`Total Turn Cost: \$\${totalCost.toFixed(6)}\`);

return {
    text: response.text,
    cost: totalCost,
    tokens: usage.totalTokenCount
};
`
    }
];
