"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import ShikiHighlighter from "react-shiki";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface CodeBlockProps {
    code: string;
    lang?: string;
    className?: string;
    maxHeight?: string;
    showCopyButton?: boolean;
}

interface CodebarProps {
    lang: string;
    code: string;
}

function Codebar({ lang, code }: CodebarProps) {
    const [copied, setCopied] = useState(false);

    const onCopy = () => {
        void navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="flex h-9 items-center justify-between border-b border-zinc-800 px-3 bg-zinc-900 shrink-0">
            <span className="text-xs text-zinc-400 font-mono">{lang}</span>
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700"
                onClick={onCopy}
            >
                {copied ? (
                    <Check className="size-3.5 text-green-400" />
                ) : (
                    <Copy className="size-3.5" />
                )}
                <span className="sr-only">Copy code</span>
            </Button>
        </div>
    );
}

export function CodeBlock({
    code,
    lang = "plain",
    className,
    maxHeight = "500px",
    showCopyButton = true,
}: CodeBlockProps) {
    return (
        <div
            className={cn(
                "flex flex-col rounded-lg border border-zinc-800 overflow-hidden shadow-sm bg-zinc-950 min-w-0 max-w-full",
                className,
            )}
        >
            {showCopyButton && <Codebar lang={lang} code={code} />}
            <ShikiHighlighter
                language={lang}
                theme="material-theme-darker"
                showLanguage={false}
                // Use inline maxHeight + overflow to reliably constrain large code blocks
                style={{ maxHeight: maxHeight, overflow: "auto" } as React.CSSProperties}
                className={cn(
                    "font-mono text-xs flex-1 rounded-none",
                    "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-700 hover:scrollbar-thumb-zinc-500",
                    "[&>pre]:my-0 [&>pre]:p-4 [&>pre]:overflow-auto [&>pre]:rounded-none",
                )}
            >
                {code}
            </ShikiHighlighter>
        </div>
    );
}

export function InlineCode({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <code
            className={cn(
                "mx-0.5 px-1.5 py-0.5 rounded-md font-mono text-xs",
                "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200",
                className,
            )}
        >
            {children}
        </code>
    );
}

export function MarkdownCode({
    children,
    className,
    ...props
}: {
    children?: React.ReactNode;
    className?: string;
}) {
    const match = /language-(\w+)/.exec(className ?? "");

    if (match) {
        return (
            <CodeBlock
                code={String(children).replace(/\n$/, "")}
                lang={match[1]}
                className="my-6"
            />
        );
    }

    return (
        <InlineCode className={className} {...props}>
            {children}
        </InlineCode>
    );
}
