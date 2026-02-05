"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ChatCalendarProps {
    onDateSelect: (date: string) => void;
}

export function ChatCalendar({ onDateSelect }: ChatCalendarProps) {
    const { dir } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", isOpen && "bg-slate-800 text-foreground")}
                onClick={() => setIsOpen(!isOpen)}
            >
                <CalendarIcon className="h-4 w-4" />
            </Button>

            {isOpen && (
                <div className={cn(
                    "absolute top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100",
                    dir === "rtl" ? "left-0" : "right-0"
                )}>
                    <div className="space-y-4">
                        <h4 className="font-medium text-sm text-slate-200">Jump to Date</h4>
                        <Input
                            type="date"
                            className="w-full bg-slate-950"
                            onChange={(e) => {
                                if (e.target.value) {
                                    onDateSelect(e.target.value);
                                    setIsOpen(false);
                                }
                            }}
                        />
                        <p className="text-xs text-slate-500">
                            Select a date to view past messages from that day.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
