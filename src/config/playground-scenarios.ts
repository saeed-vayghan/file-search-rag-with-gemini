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
    model: "gemini-3-flash-preview", // Using stable model for playground
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
    }
];
