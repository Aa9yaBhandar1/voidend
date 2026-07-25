"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SchemaBuilder } from "./schemaBuilder";

import { Card, CardContent } from "~/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { ConfirmDialog } from "~/components/confirm-dialog";
import { Badge } from "~/components/ui/badge";
import { Copy, Check, Settings2, Shield, KeyRound, Lock, Settings } from "lucide-react";
import { Button } from "~/components/ui/button";
import { MethodBadge } from "~/modules/workspace/ui/components/sidebar/method-badge";
import { ProjectSettingsDialog } from "~/modules/workspace/ui/components/sidebar/project-settings-dialog";
import { buildMockPath } from "~/lib/mock-path";
import { useUpdateEndpoint } from "~/hooks/use-endpoints";

import type { useEndpointById } from "~/hooks/use-endpoints";
import type { useProjectById } from "~/hooks/use-projects";

type Endpoint = NonNullable<ReturnType<typeof useEndpointById>["data"]>;
type Project = NonNullable<ReturnType<typeof useProjectById>["data"]>;

interface EndpointBarProps {
    projectId: string;
    endpointId: string | null;
    mockOrigin: string;
    endpoint: Endpoint | null | undefined;
    project: Project | null | undefined;
}

export const EndpointBar = ({ projectId, mockOrigin, endpoint, project }: EndpointBarProps) => {
    const [isSchemaBuilderOpen, setIsSchemaBuilderOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"schema" | "auth">("schema");
    const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const updateEndpoint = useUpdateEndpoint();

    const mockPath = endpoint
        ? buildMockPath(project?.basePath, endpoint.path)
        : buildMockPath(project?.basePath, "");

    const mockHost = mockOrigin.replace(/^https?:\/\//, "");
    const mockProtocol = mockOrigin.startsWith("https") ? "https://" : "http://";
    const fullEndpointUrl = endpoint
        ? `${mockProtocol}${mockHost}/mock/${projectId}${mockPath}`
        : `${mockProtocol}${mockHost}/mock/${projectId}${mockPath}`;

    const handleCopy = async () => {
        if (!fullEndpointUrl) return;

        try {
            await navigator.clipboard.writeText(fullEndpointUrl);
            setCopied(true);
            toast.success("Endpoint URL copied");
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error("Failed to copy endpoint URL");
        }
    };

    const handleOpenModal = (tab: "schema" | "auth") => {
        setActiveTab(tab);
        setIsSchemaBuilderOpen(true);
    };

    const handleResetAll = () => {
        if (!endpoint) return;
        setIsResetConfirmOpen(true);
    };

    const confirmResetAll = () => {
        if (!endpoint) return;

        updateEndpoint.mutate(
            {
                id: endpoint.id,
                responseSchema: {},
                responseCount: 1,
                statusCode: 200,
                delayMs: 0,
                failureRate: 0,
            },
            {
                onSuccess: () => {
                    toast.success("Schema reset to defaults");
                },
                onError: (error) => {
                    toast.error(error.message || "Failed to reset schema");
                },
            },
        );
    };

    return (
        <>
            <div className="w-full mx-auto p-6">
                <Card className="border shadow-lg bg-muted">
                    <CardContent className="p-6 space-y-5">
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold font-mono tracking-tight">
                                    API endpoint
                                </h2>
                                {endpoint?.authConfig?.isLoginEndpoint && (
                                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-semibold px-2 py-0.5 rounded-full gap-1">
                                        <KeyRound className="h-3 w-3" /> LOGIN
                                    </Badge>
                                )}
                                {endpoint?.authConfig?.requiresAuth && (
                                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold px-2 py-0.5 rounded-full gap-1">
                                        <Lock className="h-3 w-3" /> PROTECTED
                                    </Badge>
                                )}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsProjectSettingsOpen(true)}
                                className="h-8 gap-1.5 text-xs font-medium"
                                title="Manage project JWT secret and settings"
                            >
                                <Settings className="h-3.5 w-3.5 text-primary" />
                                Project Setting
                            </Button>
                        </div>

                        {/* Endpoint URL Presentation */}
                        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-background/60 p-3 dark:border-zinc-800">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    {endpoint && <MethodBadge method={endpoint.method} />}
                                    <div className="flex min-w-0 flex-wrap items-center gap-1 font-mono text-sm sm:text-base">
                                        <span className="text-blue-500">{mockProtocol}</span>
                                        <span className="rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                                            {mockHost}
                                        </span>
                                        <span className="text-zinc-400">/mock/{projectId}</span>
                                        <span className="rounded bg-orange-100 px-1.5 py-0.5 font-medium text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                                            {mockPath}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCopy}
                                    className="h-8 gap-2"
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Controls Bar */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center pt-2">
                            {/* Primary Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    variant="default"
                                    onClick={() => handleOpenModal("schema")}
                                    disabled={!endpoint}
                                    className="pt-2 pb-2 gap-1.5"
                                >
                                    <Settings2 className="w-4 h-4 stroke-3" />
                                    Configure schema
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => handleOpenModal("auth")}
                                    disabled={!endpoint}
                                    className="pt-2 pb-2 gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                                >
                                    <Shield className="w-4 h-4 text-emerald-500" />
                                    Authentication
                                </Button>
                            </div>

                            {/* Utility Bulk Actions */}
                            <Button
                                variant="secondary"
                                disabled={!endpoint || updateEndpoint.isPending}
                                onClick={handleResetAll}
                                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 h-10 font-medium rounded-xl text-sm px-4"
                            >
                                {updateEndpoint.isPending ? "Resetting..." : "Reset all"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Endpoint Configuration Dialog */}
            <Dialog open={isSchemaBuilderOpen && !!endpoint} onOpenChange={setIsSchemaBuilderOpen}>
                <DialogContent className="w-full max-w-4xl md:max-w-3xl sm:max-w-xl h-[85vh] flex flex-col p-0 overflow-hidden">
                    <DialogTitle className="sr-only">Endpoint Settings Manager</DialogTitle>

                    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
                        {endpoint && (
                            <SchemaBuilder
                                endpoint={endpoint}
                                initialTab={activeTab}
                                onSuccess={() => setIsSchemaBuilderOpen(false)}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Project Settings Dialog */}
            <ProjectSettingsDialog
                projectId={projectId}
                open={isProjectSettingsOpen}
                onOpenChange={setIsProjectSettingsOpen}
            />

            {/* Reset Confirmation Dialog */}
            <ConfirmDialog
                open={isResetConfirmOpen}
                onOpenChange={setIsResetConfirmOpen}
                title="Reset schema?"
                description="This will restore the endpoint schema and response settings to the default values."
                confirmLabel="Reset"
                cancelLabel="Cancel"
                destructive
                onConfirm={confirmResetAll}
            />
        </>
    );
};
