export function DateSeparator({ date }: { date: string }) {
    return (
        <div className="flex items-center gap-4 py-4">
            <div className="h-px flex-1 bg-border/40" />
            <span className="text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                {new Date(date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                })}
            </span>
            <div className="h-px flex-1 bg-border/40" />
        </div>
    );
}
