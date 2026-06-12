"use client";

import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";

export function ResponseView() {
    return (
        <div className="flex flex-col h-full bg-muted/10">
            {/* Response Header */}
            <div className="flex items-center justify-between p-2 px-4 border-b bg-muted/20">
                <span className="text-sm font-semibold text-muted-foreground">Response</span>
                <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge
                            variant="outline"
                            className="text-green-500 border-green-500 bg-green-500/10"
                        >
                            200 OK
                        </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Time:</span>
                        <span className="text-foreground">124 ms</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Size:</span>
                        <span className="text-foreground">1.2 KB</span>
                    </div>
                </div>
            </div>

            {/* Response Body */}
            <ScrollArea className="flex-1 p-4 bg-background">
                <pre className="text-sm font-mono text-muted-foreground"></pre>
            </ScrollArea>
        </div>
    );
}
