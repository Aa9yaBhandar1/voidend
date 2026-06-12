"use client";

import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { PlusIcon } from "lucide-react";
import {
    TreeExpander,
    TreeIcon,
    TreeLabel,
    TreeNode,
    TreeNodeContent,
    TreeNodeTrigger,
    TreeProvider,
    TreeView,
} from "~/components/kibo-ui/tree";
import { FolderIcon } from "lucide-react";
import { MethodBadge } from "./collection-item";
import type { Collection, Endpoint } from "./collection-item";

const PROJECTS: Collection[] = [
    {
        id: "stripe-api",
        name: "Stripe API",
        children: [
            {
                id: "stripe-payments",
                name: "Payments",
                endpoints: [
                    { id: "ep-1", name: "/v1/payment_intents", method: "GET" },
                    { id: "ep-2", name: "/v1/payment_intents", method: "POST" },
                    { id: "ep-3", name: "/v1/payment_intents/:id", method: "GET" },
                    { id: "ep-4", name: "/v1/payment_intents/:id", method: "PATCH" },
                ],
            },
            {
                id: "stripe-customers",
                name: "Customers",
                endpoints: [
                    { id: "ep-5", name: "/v1/customers", method: "GET" },
                    { id: "ep-6", name: "/v1/customers", method: "POST" },
                    { id: "ep-7", name: "/v1/customers/:id", method: "DELETE" },
                ],
            },
            {
                id: "stripe-webhooks",
                name: "Webhooks",
                endpoints: [
                    { id: "ep-8", name: "/v1/webhook_endpoints", method: "GET" },
                    { id: "ep-9", name: "/v1/webhook_endpoints", method: "POST" },
                    { id: "ep-10", name: "/v1/webhook_endpoints/:id", method: "PUT" },
                ],
            },
        ],
    },
    {
        id: "github-api",
        name: "GitHub REST API",
        children: [
            {
                id: "github-repos",
                name: "Repositories",
                children: [
                    {
                        id: "github-repos-issues",
                        name: "Issues",
                        endpoints: [
                            { id: "ep-11", name: "/repos/:owner/:repo/issues", method: "GET" },
                            { id: "ep-12", name: "/repos/:owner/:repo/issues", method: "POST" },
                            {
                                id: "ep-13",
                                name: "/repos/:owner/:repo/issues/:id",
                                method: "PATCH",
                            },
                        ],
                    },
                    {
                        id: "github-repos-pulls",
                        name: "Pull Requests",
                        endpoints: [
                            { id: "ep-14", name: "/repos/:owner/:repo/pulls", method: "GET" },
                            { id: "ep-15", name: "/repos/:owner/:repo/pulls", method: "POST" },
                            { id: "ep-16", name: "/repos/:owner/:repo/pulls/:id", method: "PATCH" },
                        ],
                    },
                ],
                endpoints: [
                    { id: "ep-17", name: "/user/repos", method: "GET" },
                    { id: "ep-18", name: "/orgs/:org/repos", method: "GET" },
                    { id: "ep-19", name: "/user/repos", method: "POST" },
                ],
            },
            {
                id: "github-users",
                name: "Users",
                endpoints: [
                    { id: "ep-20", name: "/users/:username", method: "GET" },
                    { id: "ep-21", name: "/users/:username/followers", method: "GET" },
                    { id: "ep-22", name: "/user", method: "GET" },
                ],
            },
        ],
    },
    {
        id: "openai-api",
        name: "OpenAI API",
        children: [
            {
                id: "openai-chat",
                name: "Chat",
                endpoints: [{ id: "ep-23", name: "/v1/chat/completions", method: "POST" }],
            },
            {
                id: "openai-embeddings",
                name: "Embeddings",
                endpoints: [{ id: "ep-24", name: "/v1/embeddings", method: "POST" }],
            },
            {
                id: "openai-models",
                name: "Models",
                endpoints: [
                    { id: "ep-25", name: "/v1/models", method: "GET" },
                    { id: "ep-26", name: "/v1/models/:id", method: "GET" },
                    { id: "ep-27", name: "/v1/models/:id", method: "DELETE" },
                ],
            },
        ],
    },
];

function collectFolderIds(collections: Collection[]): string[] {
    return collections.flatMap((c) => [c.id, ...(c.children ? collectFolderIds(c.children) : [])]);
}

function EndpointNode({
    endpoint,
    level,
    isLast,
}: {
    endpoint: Endpoint;
    level: number;
    isLast: boolean;
}) {
    return (
        <TreeNode nodeId={endpoint.id} level={level} isLast={isLast}>
            <TreeNodeTrigger className="group hover:bg-accent hover:text-accent-foreground rounded-md">
                <TreeExpander />
                <MethodBadge method={endpoint.method} />
                <TreeLabel className="truncate text-xs text-muted-foreground group-hover:text-accent-foreground">
                    {endpoint.name}
                </TreeLabel>
            </TreeNodeTrigger>
        </TreeNode>
    );
}

function CollectionNode({
    collection,
    level = 0,
    isLast = false,
}: {
    collection: Collection;
    level?: number;
    isLast?: boolean;
}) {
    const allChildren: React.ReactNode[] = [];

    collection.children?.forEach((child, i) => {
        const isLastChild = i === collection.children!.length - 1 && !collection.endpoints?.length;
        allChildren.push(
            <CollectionNode
                key={child.id}
                collection={child}
                level={level + 1}
                isLast={isLastChild}
            />,
        );
    });

    collection.endpoints?.forEach((ep, i) => {
        allChildren.push(
            <EndpointNode
                key={ep.id}
                endpoint={ep}
                level={level + 1}
                isLast={i === collection.endpoints!.length - 1}
            />,
        );
    });

    const hasChildren = allChildren.length > 0;

    return (
        <TreeNode nodeId={collection.id} level={level} isLast={isLast}>
            <TreeNodeTrigger className="hover:bg-accent hover:text-accent-foreground rounded-md font-medium">
                <TreeExpander hasChildren={hasChildren} />
                <TreeIcon
                    hasChildren={hasChildren}
                    icon={
                        level === 0 ? undefined : (
                            <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        )
                    }
                />
                <TreeLabel className="truncate text-sm">{collection.name}</TreeLabel>
            </TreeNodeTrigger>

            {hasChildren && <TreeNodeContent hasChildren>{allChildren}</TreeNodeContent>}
        </TreeNode>
    );
}

export function Sidebar() {
    const defaultExpandedIds = collectFolderIds(PROJECTS).slice(0, 4);

    return (
        <div className="h-full w-full flex flex-col bg-muted/10 border-r">
            <div className="px-4 py-3 border-b flex items-center justify-between">
                <span className="text-sm font-semibold tracking-tight">Collections</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                >
                    <PlusIcon className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1 px-2 py-2">
                <TreeProvider
                    defaultExpandedIds={defaultExpandedIds}
                    onSelectionChange={(ids) => console.log("Selected:", ids)}
                >
                    <TreeView>
                        {PROJECTS.map((project, i) => (
                            <CollectionNode
                                key={project.id}
                                collection={project}
                                level={0}
                                isLast={i === PROJECTS.length - 1}
                            />
                        ))}
                    </TreeView>
                </TreeProvider>
            </ScrollArea>
        </div>
    );
}
