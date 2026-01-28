"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function UploadButton() {
    const { t } = useI18n();

    const handleClick = () => {
        const element = document.getElementById("upload-section");
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    return (
        <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleClick}
        >
            <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" /> {/* RTL margin fix */}
            {t.upload.title}
        </Button>
    );
}
