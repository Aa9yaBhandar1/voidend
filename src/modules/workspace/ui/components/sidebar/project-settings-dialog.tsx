"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Copy, Check, RefreshCw, KeyRound, Save } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { useProjectById, useUpdateProject } from "~/hooks/use-projects";

interface ProjectSettingsDialogProps {
    projectId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProjectSettingsDialog({
    projectId,
    open,
    onOpenChange,
}: ProjectSettingsDialogProps) {
    const { data: project } = useProjectById(projectId);
    const updateProject = useUpdateProject();

    const [title, setTitle] = useState("");
    const [basePath, setBasePath] = useState("/");
    const [secret, setSecret] = useState("");
    const [showSecret, setShowSecret] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (project) {
            setTitle(project.title ?? "");
            setBasePath(project.basePath ?? "/");
            setSecret(project.secret ?? "");
        }
    }, [project]);

    if (!project) return null;

    const handleCopy = async () => {
        if (!secret) return;
        try {
            await navigator.clipboard.writeText(secret);
            setCopied(true);
            toast.success("JWT secret copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy secret");
        }
    };

    const handleRegenerate = () => {
        // Generate a cryptographically secure 32-byte hex secret
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const newSecret = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");

        updateProject.mutate(
            { id: project.id, secret: newSecret },
            {
                onSuccess: (updated) => {
                    if (updated) setSecret(updated.secret);
                    toast.success("Project secret regenerated");
                },
            },
        );
    };

    const handleSaveGeneral = () => {
        if (!title.trim()) {
            toast.error("Project name is required");
            return;
        }

        updateProject.mutate(
            {
                id: project.id,
                title: title.trim(),
                basePath: basePath.trim() || "/",
                secret: secret.trim() || undefined,
            },
            {
                onSuccess: () => {
                    toast.success("Project settings saved");
                    onOpenChange(false);
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md gap-5 sm:max-w-lg">
                <DialogHeader className="gap-1">
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                        <KeyRound className="h-5 w-5 text-primary" />
                        Project Settings
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-1">
                    {/* Project Name & Base Path */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="project-title"
                                className="text-xs font-semibold uppercase text-muted-foreground"
                            >
                                Project Name
                            </Label>
                            <Input
                                id="project-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="My API Project"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="project-base-path"
                                className="text-xs font-semibold uppercase text-muted-foreground"
                            >
                                Base Path
                            </Label>
                            <Input
                                id="project-base-path"
                                value={basePath}
                                onChange={(e) => setBasePath(e.target.value)}
                                placeholder="/"
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* JWT Secret Section */}
                    <div className="space-y-2.5 rounded-xl border bg-muted/30 p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-semibold flex items-center gap-1.5">
                                    Project JWT Secret
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Used to sign JWTs for login endpoints &amp; verify auth headers.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Input
                                    type={showSecret ? "text" : "password"}
                                    value={secret}
                                    onChange={(e) => setSecret(e.target.value)}
                                    className="font-mono text-sm pr-10 tracking-wider bg-background"
                                    placeholder="JWT Secret"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowSecret((v) => !v)}
                                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                                    title={showSecret ? "Hide secret" : "Reveal secret"}
                                >
                                    {showSecret ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleCopy}
                                className="h-9 w-9 shrink-0"
                                title="Copy secret"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-emerald-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-muted-foreground font-mono">
                                Length: {secret.length} chars
                            </span>

                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleRegenerate}
                                disabled={updateProject.isPending}
                                className="h-7 text-xs gap-1.5"
                            >
                                <RefreshCw
                                    className={`h-3 w-3 ${updateProject.isPending ? "animate-spin" : ""}`}
                                />
                                Regenerate
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveGeneral}
                        disabled={updateProject.isPending || !title.trim()}
                        className="gap-1.5 font-semibold"
                    >
                        <Save className="h-4 w-4" />
                        {updateProject.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
