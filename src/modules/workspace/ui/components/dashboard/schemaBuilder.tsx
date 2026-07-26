"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, MonitorPlay, Info, Shield, SlidersHorizontal } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Slider } from "~/components/ui/slider";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { EndpointAuthForm } from "./endpoint-auth-form";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { useUpdateEndpoint } from "~/hooks/use-endpoints";
import { resolveResponseData } from "~/lib/schema-resolver";
import type { HttpMethod } from "../sidebar/types";
import {
    FAKER_OPTIONS,
    type SchemaField,
    fieldsFromSchema,
    buildSchema,
} from "~/lib/faker-options";

interface SchemaBuilderProps {
    endpoint: {
        id: string;
        projectId?: string;
        name: string;
        method: HttpMethod;
        path: string;
        statusCode: number;
        delayMs: number;
        failureRate: number;
        responseSchema: unknown;
        responseCount: number;
    };
    projectId?: string;
    initialTab?: "schema" | "auth";
    onSuccess?: () => void;
}

function FieldLabel({ children, tooltip }: { children: React.ReactNode; tooltip: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <Label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                {children}
            </Label>
            <Tooltip>
                <TooltipTrigger
                    render={
                        <span className="inline-flex cursor-pointer text-muted-foreground/60 hover:text-primary transition-colors">
                            <Info className="h-3 w-3" />
                        </span>
                    }
                />
                <TooltipContent side="top" className="max-w-56 text-xs">
                    {tooltip}
                </TooltipContent>
            </Tooltip>
        </div>
    );
}

export function SchemaBuilder({
    endpoint,
    projectId,
    initialTab = "schema",
    onSuccess,
}: SchemaBuilderProps) {
    const [activeTab, setActiveTab] = useState<"schema" | "auth">(initialTab);
    const [resourceName, setResourceName] = useState(endpoint.name);
    const [nameError, setNameError] = useState<string | null>(null);
    const [schemaPath, setSchemaPath] = useState(endpoint.path);
    const [pathError, setPathError] = useState<string | null>(null);
    const [httpMethod, setHttpMethod] = useState<HttpMethod>(endpoint.method);
    const [delayMs, setDelayMs] = useState(endpoint.delayMs);
    const [failureRate, setFailureRate] = useState(endpoint.failureRate);
    const [responseCount, setResponseCount] = useState(endpoint.responseCount);
    const [fields, setFields] = useState<SchemaField[]>([
        { id: crypto.randomUUID(), fieldName: "", dataType: "$faker.string.uuid" },
    ]);
    const [editorMode, setEditorMode] = useState<"flat" | "raw">("flat");
    const [rawSchemaText, setRawSchemaText] = useState<string>("");
    const [jsonError, setJsonError] = useState<string | null>(null);

    const updateEndpoint = useUpdateEndpoint();

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        setResourceName(endpoint.name);
        setNameError(null);
        setSchemaPath(endpoint.path);
        setPathError(null);
        setHttpMethod(endpoint.method);
        setDelayMs(endpoint.delayMs);
        setFailureRate(endpoint.failureRate);
        setResponseCount(endpoint.responseCount);
        setFields(fieldsFromSchema(endpoint.responseSchema));
        setRawSchemaText(
            endpoint.responseSchema
                ? JSON.stringify(endpoint.responseSchema, null, 2)
                : JSON.stringify({ id: "$faker.string.uuid" }, null, 2),
        );
        setJsonError(null);
    }, [endpoint]);

    const addField = () => {
        setFields([
            ...fields,
            {
                id: crypto.randomUUID(),
                fieldName: "",
                dataType: "$faker.string.uuid",
            },
        ]);
    };

    const removeField = (id: string) => {
        if (fields.length === 1) return;
        setFields(fields.filter((field) => field.id !== id));
    };

    const updateField = (id: string, key: keyof SchemaField, value: string) => {
        const nextFields = fields.map((field) =>
            field.id === id ? { ...field, [key]: value } : field,
        );
        setFields(nextFields);
    };

    const seed = projectId || endpoint.projectId || endpoint.id;

    const previewData = useMemo(() => {
        let formattedSchema: unknown;
        if (editorMode === "raw") {
            try {
                formattedSchema = JSON.parse(rawSchemaText);
            } catch {
                formattedSchema = buildSchema(fields);
            }
        } else {
            formattedSchema = buildSchema(fields);
        }

        return resolveResponseData(formattedSchema, responseCount, seed);
    }, [fields, editorMode, rawSchemaText, responseCount, seed]);

    const hasExistingSchema = useMemo(() => {
        if (
            !endpoint.responseSchema ||
            typeof endpoint.responseSchema !== "object" ||
            Array.isArray(endpoint.responseSchema)
        ) {
            return false;
        }

        return Object.keys(endpoint.responseSchema).length > 0;
    }, [endpoint.responseSchema]);

    const handleSubmit = () => {
        let hasError = false;

        if (!resourceName.trim()) {
            setNameError("Resource name is required.");
            hasError = true;
        } else {
            setNameError(null);
        }

        const trimmedPath = schemaPath.trim();
        if (!trimmedPath) {
            setPathError("Path is required.");
            hasError = true;
        } else if (!trimmedPath.startsWith("/")) {
            setPathError("Path must start with /");
            hasError = true;
        } else {
            setPathError(null);
        }

        if (hasError) return;

        let formattedSchema: unknown;
        if (editorMode === "raw") {
            try {
                formattedSchema = JSON.parse(rawSchemaText);
            } catch (err: any) {
                setJsonError(err.message || "Invalid JSON syntax");
                toast.error("Please fix JSON syntax errors before saving.");
                return;
            }
        } else {
            formattedSchema = buildSchema(fields);
        }

        updateEndpoint.mutate(
            {
                id: endpoint.id,
                name: resourceName,
                path: trimmedPath,
                method: httpMethod,
                responseSchema: formattedSchema as Record<string, unknown>,
                delayMs: delayMs,
                failureRate: failureRate,
                responseCount: responseCount,
            },
            {
                onSuccess: () => {
                    toast.success("Schema saved");
                    if (onSuccess) onSuccess();
                },
                onError: (error) => {
                    toast.error(error.message || "Failed to save schema");
                },
            },
        );
    };

    return (
        <TooltipProvider delay={150}>
            <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "schema" | "auth")}
                orientation="horizontal"
                className="w-full flex-1 flex flex-col gap-0"
            >
                <div className="w-full px-6 pt-5 pb-3 border-b bg-muted/30">
                    <TabsList className="grid w-full grid-cols-2 h-10">
                        <TabsTrigger
                            value="schema"
                            className="gap-2 text-xs font-semibold uppercase tracking-wider"
                        >
                            <SlidersHorizontal className="h-4 w-4" /> Schema &amp; Behavior
                        </TabsTrigger>
                        <TabsTrigger
                            value="auth"
                            className="gap-2 text-xs font-semibold uppercase tracking-wider"
                        >
                            <Shield className="h-4 w-4 text-emerald-500" /> Authentication
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="schema" className="flex-1 flex flex-col">
                    <Card className="gap-6 border-none py-6 px-4 shadow-none rounded-none h-full flex flex-col justify-between">
                        <CardHeader className="gap-1 px-0">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Configure resource
                            </CardTitle>
                            <CardDescription className="font-mono text-xs">
                                Define the endpoint&apos;s identity, behavior, and response shape.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6 px-0">
                            {/* Resource name */}
                            <div className="space-y-1.5">
                                <Label htmlFor="resource-name" className="text-sm font-semibold">
                                    Resource name
                                </Label>
                                <Input
                                    id="resource-name"
                                    placeholder="users, comments, articles..."
                                    value={resourceName}
                                    onChange={(e) => {
                                        setResourceName(e.target.value);
                                        if (nameError) setNameError(null);
                                    }}
                                    aria-invalid={!!nameError}
                                    className="h-11 border-0 bg-muted font-mono text-base shadow-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:ring-2 aria-invalid:ring-destructive/50"
                                />
                                {nameError && (
                                    <p className="text-xs font-medium text-destructive">
                                        {nameError}
                                    </p>
                                )}
                            </div>

                            {/* Schema path + HTTP method */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold">Schema path</Label>
                                <div className="flex items-stretch gap-2">
                                    {/* Method pill-toggle */}
                                    <div className="flex rounded-md bg-muted p-0.5 shrink-0">
                                        {(
                                            [
                                                "GET",
                                                "POST",
                                                "PUT",
                                                "PATCH",
                                                "DELETE",
                                            ] as HttpMethod[]
                                        ).map((m) => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setHttpMethod(m)}
                                                className={`px-2 py-1 rounded-sm text-[11px] font-bold tracking-wide transition-colors ${
                                                    httpMethod === m
                                                        ? m === "GET"
                                                            ? "bg-emerald-500/20 text-emerald-400 shadow-xs"
                                                            : m === "POST"
                                                              ? "bg-blue-500/20 text-blue-400 shadow-xs"
                                                              : m === "PUT"
                                                                ? "bg-amber-500/20 text-amber-400 shadow-xs"
                                                                : m === "PATCH"
                                                                  ? "bg-purple-500/20 text-purple-400 shadow-xs"
                                                                  : "bg-rose-500/20 text-rose-400 shadow-xs"
                                                        : "text-muted-foreground hover:text-foreground"
                                                }`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Path input */}
                                    <div className="relative flex-1">
                                        <Input
                                            id="schema-path"
                                            placeholder="/users/:id"
                                            value={schemaPath}
                                            onChange={(e) => {
                                                setSchemaPath(e.target.value);
                                                if (pathError) setPathError(null);
                                            }}
                                            aria-invalid={!!pathError}
                                            className="h-11 border-0 bg-muted font-mono text-sm shadow-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:ring-2 aria-invalid:ring-destructive/50"
                                        />
                                    </div>
                                </div>
                                {pathError && (
                                    <p className="text-xs font-medium text-destructive">
                                        {pathError}
                                    </p>
                                )}
                            </div>

                            <Separator />

                            {/* Behavior config */}
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                                <div className="space-y-1.5">
                                    <FieldLabel tooltip="Simulated network latency before this endpoint responds.">
                                        Delay
                                    </FieldLabel>
                                    <div className="relative">
                                        <Input
                                            id="delay-ms"
                                            type="number"
                                            min={0}
                                            value={delayMs}
                                            onChange={(e) => setDelayMs(Number(e.target.value))}
                                            className="h-10 border-0 bg-muted pr-10 font-mono shadow-none focus-visible:ring-2 focus-visible:ring-ring"
                                        />
                                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                                            ms
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <FieldLabel tooltip="Probability that a request to this endpoint returns an error response.">
                                        Failure rate
                                    </FieldLabel>
                                    <div className="flex h-10 items-center gap-3 rounded-md bg-muted px-3">
                                        <Slider
                                            value={[failureRate]}
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            onValueChange={(value) =>
                                                setFailureRate(
                                                    Array.isArray(value) ? value[0]! : value,
                                                )
                                            }
                                            className="flex-1"
                                        />
                                        <span className="w-7 shrink-0 text-right font-mono text-xs tabular-nums">
                                            {failureRate.toFixed(1)}
                                        </span>
                                    </div>
                                </div>

                                <div className="col-span-2 space-y-1.5 md:col-span-1">
                                    <FieldLabel tooltip="Number of mock items generated per response.">
                                        Response count
                                    </FieldLabel>
                                    <Input
                                        id="response-count"
                                        type="number"
                                        min={1}
                                        value={responseCount}
                                        onChange={(e) => setResponseCount(Number(e.target.value))}
                                        placeholder="10"
                                        className="h-10 border-0 bg-muted font-mono shadow-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Schema fields editor with Flat vs Raw JSON tabs */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <FieldLabel tooltip="Define the fields used to generate mock data.">
                                        Fields schema
                                    </FieldLabel>
                                    <div className="flex items-center gap-2">
                                        <div className="flex rounded-md bg-muted p-0.5 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (editorMode === "raw") {
                                                        try {
                                                            const parsed =
                                                                JSON.parse(rawSchemaText);
                                                            setFields(fieldsFromSchema(parsed));
                                                            setJsonError(null);
                                                        } catch {
                                                            // Keep current fields if invalid
                                                        }
                                                    }
                                                    setEditorMode("flat");
                                                }}
                                                className={`px-2.5 py-1 rounded-sm font-medium transition-colors ${
                                                    editorMode === "flat"
                                                        ? "bg-background text-foreground shadow-xs font-semibold"
                                                        : "text-muted-foreground hover:text-foreground"
                                                }`}
                                            >
                                                Flat Columns
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (editorMode === "flat") {
                                                        const current = buildSchema(fields);
                                                        setRawSchemaText(
                                                            JSON.stringify(current, null, 2),
                                                        );
                                                    }
                                                    setEditorMode("raw");
                                                }}
                                                className={`px-2.5 py-1 rounded-sm font-medium transition-colors ${
                                                    editorMode === "raw"
                                                        ? "bg-background text-foreground shadow-xs font-semibold"
                                                        : "text-muted-foreground hover:text-foreground"
                                                }`}
                                            >
                                                Nested Raw JSON
                                            </button>
                                        </div>
                                        {editorMode === "flat" && (
                                            <Badge
                                                variant="secondary"
                                                className="font-mono text-xs font-medium"
                                            >
                                                {fields.length}{" "}
                                                {fields.length === 1 ? "field" : "fields"}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {editorMode === "flat" ? (
                                    <div className="space-y-2">
                                        {fields.length > 0 && (
                                            <div className="hidden grid-cols-[1fr_1fr_2.5rem] gap-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
                                                <div>Field name</div>
                                                <div>Data type</div>
                                                <div />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {fields.map((field) => (
                                                <div
                                                    key={field.id}
                                                    className="grid grid-cols-[1fr_1fr_2.5rem] items-center gap-2 rounded-lg border border-transparent p-1 transition-colors hover:border-border sm:gap-3"
                                                >
                                                    <Input
                                                        type="text"
                                                        placeholder="e.g. user_id, created_at"
                                                        value={field.fieldName}
                                                        onChange={(e) =>
                                                            updateField(
                                                                field.id,
                                                                "fieldName",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="h-10 border-0 bg-muted font-mono text-sm shadow-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    />

                                                    <Select
                                                        value={field.dataType}
                                                        onValueChange={(value) => {
                                                            if (value)
                                                                updateField(
                                                                    field.id,
                                                                    "dataType",
                                                                    value,
                                                                );
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-10 w-full border-0 bg-muted font-mono text-sm shadow-none focus-visible:ring-2 focus-visible:ring-ring">
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {FAKER_OPTIONS.map((group) => (
                                                                <SelectGroup key={group.label}>
                                                                    <SelectLabel>
                                                                        {group.label}
                                                                    </SelectLabel>
                                                                    {group.options.map((option) => (
                                                                        <SelectItem
                                                                            key={option.value}
                                                                            value={option.value}
                                                                        >
                                                                            {option.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectGroup>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    <Tooltip>
                                                        <TooltipTrigger
                                                            render={
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    disabled={fields.length === 1}
                                                                    onClick={() =>
                                                                        removeField(field.id)
                                                                    }
                                                                    className="h-10 w-10 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            }
                                                        />
                                                        <TooltipContent
                                                            side="left"
                                                            className="text-xs"
                                                        >
                                                            {fields.length === 1
                                                                ? "At least one field is required"
                                                                : "Remove field"}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between mt-1">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={addField}
                                                size="sm"
                                                className="h-9 gap-1.5 border-dashed border-primary text-muted-foreground hover:text-primary hover:color-primary"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                <FieldLabel tooltip="Add a new field to the schema.">
                                                    Add field
                                                </FieldLabel>
                                            </Button>

                                            <Button
                                                type="button"
                                                onClick={handleSubmit}
                                                disabled={updateEndpoint.isPending}
                                                size="sm"
                                                className="h-9 gap-2 font-semibold text-primary-foreground"
                                            >
                                                {updateEndpoint.isPending
                                                    ? "Saving..."
                                                    : hasExistingSchema
                                                      ? "Update schema"
                                                      : "Generate schema"}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-mono text-muted-foreground">
                                                JSON Editor (Tab / Enter auto-indent, &quot;
                                                auto-pairs)
                                            </span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    try {
                                                        const parsed = JSON.parse(rawSchemaText);
                                                        const formatted = JSON.stringify(
                                                            parsed,
                                                            null,
                                                            2,
                                                        );
                                                        setRawSchemaText(formatted);
                                                        setJsonError(null);
                                                        toast.success("JSON formatted");
                                                    } catch {
                                                        toast.error(
                                                            "Cannot format: invalid JSON syntax",
                                                        );
                                                    }
                                                }}
                                                className="h-7 text-xs font-mono gap-1"
                                            >
                                                Format JSON
                                            </Button>
                                        </div>
                                        <textarea
                                            value={rawSchemaText}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setRawSchemaText(val);
                                                try {
                                                    const parsed = JSON.parse(val);
                                                    setFields(fieldsFromSchema(parsed));
                                                    setJsonError(null);
                                                } catch (err: any) {
                                                    setJsonError(
                                                        err.message || "Invalid JSON syntax",
                                                    );
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                const target = e.currentTarget;
                                                const { selectionStart, selectionEnd, value } =
                                                    target;

                                                // 1. Convert single quote ' to double quote "
                                                if (e.key === "'") {
                                                    e.preventDefault();
                                                    const before = value.substring(
                                                        0,
                                                        selectionStart,
                                                    );
                                                    const after = value.substring(selectionEnd);
                                                    const nextVal = `${before}"${after}`;
                                                    setRawSchemaText(nextVal);
                                                    setTimeout(() => {
                                                        target.selectionStart =
                                                            target.selectionEnd =
                                                                selectionStart + 1;
                                                    }, 0);
                                                    return;
                                                }

                                                // 2. Auto-pair double quotes " -> ""
                                                if (e.key === '"') {
                                                    if (
                                                        selectionStart === selectionEnd &&
                                                        value[selectionStart] === '"'
                                                    ) {
                                                        e.preventDefault();
                                                        target.selectionStart =
                                                            target.selectionEnd =
                                                                selectionStart + 1;
                                                        return;
                                                    }
                                                    e.preventDefault();
                                                    const before = value.substring(
                                                        0,
                                                        selectionStart,
                                                    );
                                                    const selected = value.substring(
                                                        selectionStart,
                                                        selectionEnd,
                                                    );
                                                    const after = value.substring(selectionEnd);
                                                    const nextVal = `${before}"${selected}"${after}`;
                                                    setRawSchemaText(nextVal);
                                                    setTimeout(() => {
                                                        target.selectionStart = selectionStart + 1;
                                                        target.selectionEnd =
                                                            selectionStart + 1 + selected.length;
                                                    }, 0);
                                                    return;
                                                }

                                                // 3. Auto-pair braces { -> {} and brackets [ -> []
                                                if (e.key === "{" || e.key === "[") {
                                                    const closing = e.key === "{" ? "}" : "]";
                                                    e.preventDefault();
                                                    const before = value.substring(
                                                        0,
                                                        selectionStart,
                                                    );
                                                    const selected = value.substring(
                                                        selectionStart,
                                                        selectionEnd,
                                                    );
                                                    const after = value.substring(selectionEnd);
                                                    const nextVal = `${before}${e.key}${selected}${closing}${after}`;
                                                    setRawSchemaText(nextVal);
                                                    setTimeout(() => {
                                                        target.selectionStart = selectionStart + 1;
                                                        target.selectionEnd =
                                                            selectionStart + 1 + selected.length;
                                                    }, 0);
                                                    return;
                                                }

                                                // 4. Tab key -> Insert 2 spaces
                                                if (e.key === "Tab") {
                                                    e.preventDefault();
                                                    const before = value.substring(
                                                        0,
                                                        selectionStart,
                                                    );
                                                    const after = value.substring(selectionEnd);
                                                    const nextVal = `${before}  ${after}`;
                                                    setRawSchemaText(nextVal);
                                                    setTimeout(() => {
                                                        target.selectionStart =
                                                            target.selectionEnd =
                                                                selectionStart + 2;
                                                    }, 0);
                                                    return;
                                                }

                                                // 5. Enter key -> Smart Auto-Indent matching previous line depth
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    const lineStart =
                                                        value.lastIndexOf(
                                                            "\n",
                                                            selectionStart - 1,
                                                        ) + 1;
                                                    const currentLine = value.substring(
                                                        lineStart,
                                                        selectionStart,
                                                    );
                                                    const matchIndent = currentLine.match(/^(\s*)/);
                                                    let indent = matchIndent
                                                        ? (matchIndent[1] ?? "")
                                                        : "";

                                                    const charBeforeCursor =
                                                        value[selectionStart - 1];
                                                    const charAfterCursor = value[selectionEnd];

                                                    if (
                                                        charBeforeCursor === "{" ||
                                                        charBeforeCursor === "["
                                                    ) {
                                                        indent += "  ";
                                                    }

                                                    if (
                                                        (charBeforeCursor === "{" &&
                                                            charAfterCursor === "}") ||
                                                        (charBeforeCursor === "[" &&
                                                            charAfterCursor === "]")
                                                    ) {
                                                        const outerIndent = (indent ?? "").slice(
                                                            0,
                                                            Math.max(0, (indent ?? "").length - 2),
                                                        );
                                                        const before = value.substring(
                                                            0,
                                                            selectionStart,
                                                        );
                                                        const after = value.substring(selectionEnd);
                                                        const nextVal = `${before}\n${indent ?? ""}\n${outerIndent}${after}`;
                                                        setRawSchemaText(nextVal);
                                                        setTimeout(() => {
                                                            target.selectionStart =
                                                                target.selectionEnd =
                                                                    selectionStart +
                                                                    1 +
                                                                    (indent ?? "").length;
                                                        }, 0);
                                                        return;
                                                    }

                                                    const before = value.substring(
                                                        0,
                                                        selectionStart,
                                                    );
                                                    const after = value.substring(selectionEnd);
                                                    const nextVal = `${before}\n${indent ?? ""}${after}`;
                                                    setRawSchemaText(nextVal);
                                                    setTimeout(() => {
                                                        target.selectionStart =
                                                            target.selectionEnd =
                                                                selectionStart +
                                                                1 +
                                                                (indent ?? "").length;
                                                    }, 0);
                                                    return;
                                                }
                                            }}
                                            placeholder={`{\n  "id": "$faker.string.uuid",\n  "user": {\n    "name": "$faker.person.fullName"\n  }\n}`}
                                            rows={10}
                                            className="w-full rounded-md border border-input bg-zinc-950 text-zinc-100 p-3 font-mono text-xs shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring leading-relaxed"
                                        />
                                        {jsonError && (
                                            <p className="text-xs font-mono text-destructive">
                                                JSON Error: {jsonError}
                                            </p>
                                        )}
                                        <div className="flex justify-end pt-1">
                                            <Button
                                                type="button"
                                                onClick={handleSubmit}
                                                disabled={
                                                    updateEndpoint.isPending ||
                                                    (editorMode === "raw" && !!jsonError)
                                                }
                                                size="sm"
                                                className="h-9 gap-2 font-semibold text-primary-foreground"
                                            >
                                                {updateEndpoint.isPending
                                                    ? "Saving..."
                                                    : hasExistingSchema
                                                      ? "Update schema"
                                                      : "Generate schema"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Live sample data preview */}
                            <div className="overflow-hidden rounded-lg border border-border">
                                <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-2">
                                    <MonitorPlay className="h-3 w-3 text-primary" />
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Live preview
                                    </span>
                                </div>
                                <pre className="bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-100 overflow-x-auto">
                                    {JSON.stringify(previewData, null, 2)}
                                </pre>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="auth" className="flex-1 flex flex-col">
                    <EndpointAuthForm endpointId={endpoint.id} onSuccess={onSuccess} />
                </TabsContent>
            </Tabs>
        </TooltipProvider>
    );
}
