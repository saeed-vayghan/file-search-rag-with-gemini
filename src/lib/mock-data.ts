export type FileStatus = "UPLOADING" | "INGESTING" | "ACTIVE" | "FAILED";

export interface FileData {
    id: string;
    name: string;
    type: string;
    date: string;
    status: FileStatus;
    size: string;
}

export interface CollectionData {
    id: string;
    name: string;
    icon: string;
    color: string;
    count: number;
}

export const MOCK_USER = {
    name: "Saeed",
    storageUsed: "450 GB",
    storageLimit: "1 TB",
    totalDocs: 12500,
};

export const MOCK_COLLECTIONS: CollectionData[] = [
    { id: "1", name: "Financials", icon: "💰", color: "text-amber-500", count: 2450 },
    { id: "2", name: "Legal", icon: "⚖️", color: "text-blue-500", count: 890 },
    { id: "3", name: "Research", icon: "🔬", color: "text-emerald-500", count: 1200 },
];

export const MOCK_FILES: FileData[] = [
    { id: "1", name: "Q3_Financial_Report.pdf", type: "PDF", date: "2023-10-27", status: "ACTIVE", size: "2.4 MB" },
    { id: "2", name: "Client_Contract_Acme.docx", type: "DOCX", date: "2023-10-26", status: "INGESTING", size: "1.1 MB" },
    { id: "3", name: "Transaction_Log_2023.xlsx", type: "XLSX", date: "2023-10-25", status: "ACTIVE", size: "890 KB" },
    { id: "4", name: "Project_Proposal_Draft.pdf", type: "PDF", date: "2023-10-24", status: "UPLOADING", size: "4.5 MB" },
    { id: "5", name: "Legal_Brief_Case_12.pdf", type: "PDF", date: "2023-10-27", status: "ACTIVE", size: "1.2 MB" },
    { id: "6", name: "Meeting_Notes_Oct.md", type: "MD", date: "2023-10-26", status: "ACTIVE", size: "12 KB" },
    { id: "7", name: "Budget_Forecast_2024.xlsx", type: "XLSX", date: "2023-10-25", status: "FAILED", size: "2.1 MB" },
];

export const MOCK_CHAT_HISTORY = [
    { role: "user", content: "Summarize the key risks mentioned on page 12." },
    {
        role: "ai",
        content: "Here is a summary of the risks on page 12:\n\n1. Interest rate volatility [Page 12].\n2. Credit risk exposure [Page 12].\n3. Operational resilience [Page 12].\n4. Regulatory changes [Page 13].",
    },
];
