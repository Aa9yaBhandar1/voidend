"use client";

import { useEffect, useState } from "react";
import { useAuthConfig, useUpsertAuthConfig } from "~/hooks/use-auth-config";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Shield, ShieldAlert, ShieldCheck, KeyRound, Clock, CheckCircle2 } from "lucide-react";

interface EndpointAuthFormProps {
    endpointId: string;
    onSuccess?: () => void;
}

type AuthType = "none" | "login" | "protected";

export function EndpointAuthForm({ endpointId, onSuccess }: EndpointAuthFormProps) {
    const { data: config, isLoading } = useAuthConfig(endpointId);
    const upsertConfig = useUpsertAuthConfig();

    const [authType, setAuthType] = useState<AuthType>("none");
    const [tokenExpirySeconds, setTokenExpirySeconds] = useState<number>(3600);

    useEffect(() => {
        if (config) {
            if (config.isLoginEndpoint) {
                setAuthType("login");
            } else if (config.requiresAuth) {
                setAuthType("protected");
            } else {
                setAuthType("none");
            }
            setTokenExpirySeconds(config.tokenExpirySeconds ?? 3600);
        } else {
            setAuthType("none");
            setTokenExpirySeconds(3600);
        }
    }, [config]);

    const handleSave = () => {
        const isLoginEndpoint = authType === "login";
        const requiresAuth = authType === "protected";

        upsertConfig.mutate(
            {
                endpointId,
                isLoginEndpoint,
                requiresAuth,
                tokenExpirySeconds: isLoginEndpoint ? Math.max(1, tokenExpirySeconds) : 3600,
            },
            {
                onSuccess: () => {
                    if (onSuccess) onSuccess();
                },
            },
        );
    };

    if (isLoading) {
        return (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Loading authentication settings...
            </div>
        );
    }

    return (
        <Card className="border-none py-6 px-4 shadow-none gap-6 rounded-none h-full">
            <CardHeader className="gap-1 px-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        Endpoint Authentication Settings
                    </CardTitle>
                    {authType === "login" && (
                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1">
                            <KeyRound className="h-3 w-3" /> LOGIN ENDPOINT
                        </Badge>
                    )}
                    {authType === "protected" && (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                            <ShieldCheck className="h-3 w-3" /> REQUIRES AUTH
                        </Badge>
                    )}
                    {authType === "none" && (
                        <Badge variant="outline" className="text-muted-foreground gap-1">
                            PUBLIC
                        </Badge>
                    )}
                </div>
                <CardDescription className="font-mono text-xs">
                    Configure JWT authentication behavior for this endpoint.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 px-0">
                {/* Options Selection */}
                <div className="grid gap-3">
                    {/* Option 1: None */}
                    <div
                        onClick={() => setAuthType("none")}
                        className={`group relative flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all ${
                            authType === "none"
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border bg-card hover:bg-muted/50"
                        }`}
                    >
                        <div className="mt-0.5 rounded-lg border bg-background p-2 text-muted-foreground group-hover:text-foreground">
                            <Shield className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <Label className="cursor-pointer font-semibold text-sm">
                                    None (Public Endpoint)
                                </Label>
                                {authType === "none" && (
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Anyone can request mock data from this endpoint without providing
                                credentials or tokens.
                            </p>
                        </div>
                    </div>

                    {/* Option 2: Login Endpoint */}
                    <div
                        onClick={() => setAuthType("login")}
                        className={`group relative flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all ${
                            authType === "login"
                                ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500"
                                : "border-border bg-card hover:bg-muted/50"
                        }`}
                    >
                        <div className="mt-0.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                            <KeyRound className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <Label className="cursor-pointer font-semibold text-sm text-foreground">
                                    Login Endpoint
                                </Label>
                                {authType === "login" && (
                                    <CheckCircle2 className="h-4 w-4 text-amber-500" />
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Issues a signed JWT token along with mock data when invoked. Useful
                                for mock authentication flows.
                            </p>
                        </div>
                    </div>

                    {/* Option 3: Requires Auth */}
                    <div
                        onClick={() => setAuthType("protected")}
                        className={`group relative flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all ${
                            authType === "protected"
                                ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500"
                                : "border-border bg-card hover:bg-muted/50"
                        }`}
                    >
                        <div className="mt-0.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <Label className="cursor-pointer font-semibold text-sm text-foreground">
                                    Requires Authentication
                                </Label>
                                {authType === "protected" && (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Protects mock data. Requires a valid{" "}
                                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                                    Authorization: Bearer &lt;token&gt;
                                </code>{" "}
                                header.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Token Expiry Config (only shown for Login Endpoint) */}
                {authType === "login" && (
                    <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <Label
                                htmlFor="token-expiry"
                                className="text-xs font-semibold uppercase tracking-wide text-foreground"
                            >
                                Token Expiry (seconds)
                            </Label>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <Input
                                    id="token-expiry"
                                    type="number"
                                    min={1}
                                    value={tokenExpirySeconds}
                                    onChange={(e) => setTokenExpirySeconds(Number(e.target.value))}
                                    className="font-mono text-sm pr-12 bg-background"
                                    placeholder="3600"
                                />
                                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                                    sec
                                </span>
                            </div>

                            <div className="flex gap-1.5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setTokenExpirySeconds(3600)}
                                    className="h-9 text-xs font-mono"
                                >
                                    1h (3600s)
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setTokenExpirySeconds(86400)}
                                    className="h-9 text-xs font-mono"
                                >
                                    24h (86400s)
                                </Button>
                            </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            JWT tokens generated by this endpoint will expire after this duration.
                            Default: 3600s (1 hour).
                        </p>
                    </div>
                )}
            </CardContent>

            <div className="flex justify-end pt-2">
                <Button
                    onClick={handleSave}
                    disabled={upsertConfig.isPending}
                    className="h-10 gap-2 font-semibold text-primary-foreground"
                >
                    {upsertConfig.isPending ? "Saving..." : "Save Authentication Settings"}
                </Button>
            </div>
        </Card>
    );
}
