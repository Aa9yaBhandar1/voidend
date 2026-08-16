import { Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { FAKER_OPTIONS, type SchemaField } from "~/lib/faker-options";
import { FieldLabel } from "./field-label";

interface SchemaFieldsEditorProps {
    fields: SchemaField[];
    onAddField: () => void;
    onRemoveField: (id: string) => void;
    onUpdateField: (id: string, key: keyof SchemaField, value: string) => void;
    onSubmit: () => void;
    isPending: boolean;
    hasExistingSchema: boolean;
}

export function SchemaFieldsEditor({
    fields,
    onAddField,
    onRemoveField,
    onUpdateField,
    onSubmit,
    isPending,
    hasExistingSchema,
}: SchemaFieldsEditorProps) {
    const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
    return (
        <div className="space-y-2">
            {fields.length > 0 && (
                <div className="hidden grid-cols-[1fr_1fr_2.5rem] gap-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
                    <div>Field name</div>
                    <div>Data type</div>
                    <div />
                </div>
            )}

            <div className="space-y-2">
                {fields.map((field) => {
                    const search = (searchTerms[field.id] || "").trim().toLowerCase();
                    const filteredOptions = FAKER_OPTIONS.map((group) => ({
                        label: group.label,
                        options: group.options.filter(
                            (opt) =>
                                !search ||
                                opt.label.toLowerCase().includes(search) ||
                                opt.value.toLowerCase().includes(search),
                        ),
                    })).filter((g) => g.options.length > 0);

                    return (
                        <div
                            key={field.id}
                            className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2.5rem] items-center gap-2 rounded-lg border border-transparent p-1 transition-colors hover:border-border sm:gap-3 min-w-0"
                        >
                            <Input
                                type="text"
                                placeholder="e.g. user_id, created_at"
                                value={field.fieldName}
                                onChange={(e) =>
                                    onUpdateField(field.id, "fieldName", e.target.value)
                                }
                                className="h-10 border-0 bg-muted font-mono text-sm shadow-none focus-visible:ring-2 focus-visible:ring-ring min-w-0"
                            />

                            <Select
                                value={field.dataType}
                                onValueChange={(value) => {
                                    if (value) onUpdateField(field.id, "dataType", value);
                                }}
                            >
                                <SelectTrigger className="h-10 w-full border-0 bg-muted font-mono text-sm shadow-none focus-visible:ring-2 focus-visible:ring-ring min-w-0 truncate">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <div className="px-2 pt-2 pb-1">
                                        <Input
                                            placeholder="Search types..."
                                            onChange={(e) =>
                                                setSearchTerms((s) => ({
                                                    ...s,
                                                    [field.id]: e.target.value,
                                                }))
                                            }
                                            value={searchTerms[field.id] || ""}
                                            className="h-8 text-sm bg-popover text-popover-foreground"
                                        />
                                    </div>
                                    {/** render filtered groups */}
                                    {filteredOptions.map((group) => (
                                        <SelectGroup key={group.label}>
                                            <SelectLabel>{group.label}</SelectLabel>
                                            {group.options.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
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
                                            onClick={() => onRemoveField(field.id)}
                                            className="h-10 w-10 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    }
                                />
                                <TooltipContent side="left" className="text-xs">
                                    {fields.length === 1
                                        ? "At least one field is required"
                                        : "Remove field"}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center justify-between mt-1">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onAddField}
                    size="sm"
                    className="h-9 gap-1.5 border-dashed border-primary text-muted-foreground hover:text-primary hover:color-primary"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <FieldLabel tooltip="Add a new field to the schema.">Add field</FieldLabel>
                </Button>

                <Button
                    type="button"
                    onClick={onSubmit}
                    disabled={isPending}
                    size="sm"
                    className="h-9 gap-2 font-semibold text-primary-foreground"
                >
                    {isPending
                        ? "Saving..."
                        : hasExistingSchema
                          ? "Update schema"
                          : "Generate schema"}
                </Button>
            </div>
        </div>
    );
}
