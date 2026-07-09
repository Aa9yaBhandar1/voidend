"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import type { HttpMethod } from "./types";
import { METHOD_STYLES } from "./method-badge";

export function CreateProjectDialog({
    open,
    onOpenChange,
    onCreate,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (title: string, basePath: string) => void;
}) {
    const [title, setTitle] = useState("");
    const [basePath, setBasePath] = useState("/");

    function handleSubmit() {
        if (!title.trim()) return;
        onCreate(title.trim(), basePath.trim() || "/");
        setTitle("");
        setBasePath("/");
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New project</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Project name</label>
                        <Input
                            autoFocus
                            placeholder="My API"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSubmit();
                            }}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Base path</label>
                        <Input
                            placeholder="/"
                            value={basePath}
                            onChange={(e) => setBasePath(e.target.value)}
                            className="font-mono text-sm"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!title.trim()}>
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function CreateFolderDialog({
    open,
    onOpenChange,
    onCreate,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (name: string) => void;
}) {
    const [name, setName] = useState("");

    function handleSubmit() {
        if (!name.trim()) return;
        onCreate(name.trim());
        setName("");
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New folder</DialogTitle>
                </DialogHeader>
                <Input
                    autoFocus
                    placeholder="Folder name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSubmit();
                    }}
                />
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!name.trim()}>
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function CreateEndpointDialog({
    open,
    onOpenChange,
    onCreate,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (name: string, method: HttpMethod, path: string) => void;
}) {
    const [name, setName] = useState("");
    const [method, setMethod] = useState<HttpMethod>("GET");
    const [path, setPath] = useState("/");

    function handleSubmit() {
        if (!name.trim() || !path.trim()) return;
        onCreate(name.trim(), method, path.trim());
        setName("");
        setMethod("GET");
        setPath("/");
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New endpoint</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Name</label>
                        <Input
                            autoFocus
                            placeholder="Get users"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSubmit();
                            }}
                        />
                    </div>

                    <div className="flex gap-2">
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Method</label>
                            <Select
                                value={method}
                                onValueChange={(v) => setMethod(v as HttpMethod)}
                            >
                                <SelectTrigger className="w-27.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(
                                        ["GET", "POST", "PUT", "PATCH", "DELETE"] as HttpMethod[]
                                    ).map((m) => (
                                        <SelectItem key={m} value={m}>
                                            <span
                                                className={cn(
                                                    "font-bold text-xs",
                                                    METHOD_STYLES[m],
                                                )}
                                            >
                                                {m}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-1 space-y-1.5">
                            <label className="text-xs text-muted-foreground">Path</label>
                            <Input
                                placeholder="/users"
                                value={path}
                                onChange={(e) => setPath(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSubmit();
                                }}
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!name.trim() || !path.trim()}>
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
