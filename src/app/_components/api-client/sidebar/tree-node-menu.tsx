"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { MoreHorizontalIcon, FolderPlusIcon, PencilIcon, TrashIcon } from "lucide-react";

export function TreeNodeMenu({
    onNewFolder,
    onRename,
    onDelete,
    showNewFolder = true,
}: {
    onNewFolder?: () => void;
    onRename: () => void;
    onDelete: () => void;
    showNewFolder?: boolean;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className="h-5 w-5 ml-auto opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                onClick={(e) => e.stopPropagation()}
            >
                <MoreHorizontalIcon className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
            >
                {showNewFolder && onNewFolder && (
                    <DropdownMenuItem onClick={onNewFolder}>
                        <FolderPlusIcon className="h-4 w-4 mr-2" /> New folder
                    </DropdownMenuItem>
                )}
                {showNewFolder && onNewFolder && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={onRename}>
                    <PencilIcon className="h-4 w-4 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <TrashIcon className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
