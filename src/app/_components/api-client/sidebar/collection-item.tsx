"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { ChevronRightIcon, ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/utils";

interface CollectionItemProps {
    name: string;
    icon?: React.ReactNode;
    children?: React.ReactNode;
    isEndpoint?: boolean;
    method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
    defaultOpen?: boolean;
}

const methodColors = {
    GET: "text-green-500 font-bold",
    POST: "text-yellow-500 font-bold",
    PATCH: "text-purple-500 font-bold",
    DELETE: "text-red-500 font-bold",
    PUT: "text-blue-500 font-bold",
};

export function CollectionItem({
    name,
    icon,
    children,
    isEndpoint,
    method,
    defaultOpen = false,
}: CollectionItemProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    // For the Endpoint Items (Return 1)
    if (isEndpoint) {
        return (
            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-md transition-colors text-left min-w-0">
                {method && (
                    <span className={cn("text-[10px] w-10 shrink-0", methodColors[method])}>
                        {method}
                    </span>
                )}
                <span className="truncate flex-1 min-w-0">{name}</span>
            </button>
        );
    }

    // For the Folder Items (Return 2)
    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-md transition-colors font-medium min-w-0">
                {isOpen ? (
                    <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                {icon}
                {/* Added flex-1 and min-w-0 here */}
                <span className="truncate flex-1 text-left min-w-0">{name}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>{children}</CollapsibleContent>
        </Collapsible>
    );
}
