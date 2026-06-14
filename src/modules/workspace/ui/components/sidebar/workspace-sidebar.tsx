"use client";

import { useState } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { PlusIcon, FolderIcon } from "lucide-react";
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "~/components/ui/alert-dialog";

import { MethodBadge } from "./endpoint-item";
import type { Collection, Endpoint } from "./endpoint-item";
import { TreeNodeMenu } from "./tree-node-menu";
import { CreateProjectDialog } from "~/modules/projects/ui/components/create-project-dialog";
import { CreateFolderDialog } from "./create-folder-dialog";
import { buildFolderTree } from "./folder-item";

import {
    useProjects,
    useCreateProject,
    useUpdateProject,
    useDeleteProject,
} from "~/hooks/use-projects";
import { useFolders, useCreateFolder, useRenameFolder, useDeleteFolder } from "~/hooks/use-folders";

// ---- shared action type ----
type TreeAction =
    | { type: "newFolder"; projectId: string; parentId: string | null }
    | { type: "rename"; kind: "project" | "folder"; id: string; name: string }
    | { type: "delete"; kind: "project" | "folder"; id: string; name: string };

// ---- Endpoint node (unchanged) ----
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

// ---- Collection node (project root or folder) ----
function CollectionNode({
    collection,
    level = 0,
    isLast = false,
    projectId,
    onAction,
}: {
    collection: Collection;
    level?: number;
    isLast?: boolean;
    projectId: string;
    onAction: (action: TreeAction) => void;
}) {
    const [isRenaming, setIsRenaming] = useState(false);
    const [name, setName] = useState(collection.name);

    const isProjectRoot = level === 0;
    const kind = isProjectRoot ? "project" : "folder";

    const allChildren: React.ReactNode[] = [];

    collection.children?.forEach((child, i) => {
        const isLastChild = i === collection.children!.length - 1 && !collection.endpoints?.length;
        allChildren.push(
            <CollectionNode
                key={child.id}
                collection={child}
                level={level + 1}
                isLast={isLastChild}
                projectId={projectId}
                onAction={onAction}
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

    function commitRename() {
        setIsRenaming(false);
        const trimmed = name.trim();
        if (trimmed && trimmed !== collection.name) {
            onAction({ type: "rename", kind, id: collection.id, name: trimmed });
        } else {
            setName(collection.name);
        }
    }

    return (
        <TreeNode nodeId={collection.id} level={level} isLast={isLast}>
            <TreeNodeTrigger className="group hover:bg-accent hover:text-accent-foreground rounded-md font-medium">
                <TreeExpander hasChildren={hasChildren} />
                <TreeIcon
                    hasChildren={hasChildren}
                    icon={
                        level === 0 ? undefined : (
                            <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        )
                    }
                />

                {isRenaming ? (
                    <input
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            if (e.key === "Escape") {
                                setName(collection.name);
                                setIsRenaming(false);
                            }
                        }}
                        className="text-sm bg-transparent border-b border-primary outline-none flex-1 min-w-0"
                    />
                ) : (
                    <TreeLabel className="truncate text-sm">{collection.name}</TreeLabel>
                )}

                <TreeNodeMenu
                    onNewFolder={() =>
                        onAction({
                            type: "newFolder",
                            projectId,
                            parentId: isProjectRoot ? null : collection.id,
                        })
                    }
                    onRename={() => setIsRenaming(true)}
                    onDelete={() =>
                        onAction({
                            type: "delete",
                            kind,
                            id: collection.id,
                            name: collection.name,
                        })
                    }
                />
            </TreeNodeTrigger>

            {hasChildren && <TreeNodeContent hasChildren>{allChildren}</TreeNodeContent>}
        </TreeNode>
    );
}

// ---- One project root, fetches its own folders ----
function ProjectNode({
    project,
    isLast,
    onAction,
}: {
    project: { id: string; title: string };
    isLast: boolean;
    onAction: (action: TreeAction) => void;
}) {
    const { data: folders, isLoading } = useFolders(project.id);

    if (isLoading) {
        return <div className="px-3 py-2 text-xs text-muted-foreground">Loading...</div>;
    }

    const collection: Collection = {
        id: project.id,
        name: project.title,
        children: folders ? buildFolderTree(folders) : [],
    };

    return (
        <CollectionNode
            collection={collection}
            level={0}
            isLast={isLast}
            projectId={project.id}
            onAction={onAction}
        />
    );
}

export function Sidebar() {
    const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
    const [folderDialog, setFolderDialog] = useState<{
        projectId: string;
        parentId: string | null;
    } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{
        kind: "project" | "folder";
        id: string;
        name: string;
    } | null>(null);

    const { data: projects, isLoading } = useProjects();

    const createProject = useCreateProject();
    const renameProject = useUpdateProject();
    const deleteProject = useDeleteProject();

    const createFolder = useCreateFolder();
    const renameFolder = useRenameFolder();
    const deleteFolder = useDeleteFolder();

    function handleAction(action: TreeAction) {
        switch (action.type) {
            case "newFolder":
                setFolderDialog({
                    projectId: action.projectId,
                    parentId: action.parentId,
                });
                break;

            case "rename":
                if (action.kind === "project") {
                    renameProject.mutate({ id: action.id, title: action.name });
                } else {
                    renameFolder.mutate({ id: action.id, name: action.name });
                }
                break;

            case "delete":
                setDeleteTarget({
                    kind: action.kind,
                    id: action.id,
                    name: action.name,
                });
                break;
        }
    }

    function confirmDelete() {
        if (!deleteTarget) return;
        if (deleteTarget.kind === "project") {
            deleteProject.mutate({ id: deleteTarget.id });
        } else {
            deleteFolder.mutate({ id: deleteTarget.id });
        }
        setDeleteTarget(null);
    }

    if (isLoading) return <p>Loading...</p>;

    return (
        <div className="h-full w-full flex flex-col bg-muted/10 border-r">
            <div className="px-4 py-3 border-b flex items-center justify-between">
                <span className="text-sm font-semibold tracking-tight">Collections</span>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsCreateProjectOpen(true)}
                >
                    <PlusIcon className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1 px-2 py-2">
                <TreeProvider
                    defaultExpandedIds={[]}
                    onSelectionChange={(ids) => console.log("Selected:", ids)}
                >
                    <TreeView>
                        {projects?.map((project, i) => (
                            <ProjectNode
                                key={project.id}
                                project={project}
                                isLast={i === projects.length - 1}
                                onAction={handleAction}
                            />
                        ))}
                    </TreeView>
                </TreeProvider>
            </ScrollArea>

            {/* New project */}
            <CreateProjectDialog
                open={isCreateProjectOpen}
                onOpenChange={setIsCreateProjectOpen}
                onCreate={(title) => createProject.mutateAsync({ title })}
            />

            {/* New folder */}
            <CreateFolderDialog
                open={!!folderDialog}
                onOpenChange={(open) => !open && setFolderDialog(null)}
                onCreate={(name) => {
                    if (!folderDialog) return;
                    createFolder.mutate({
                        name,
                        projectId: folderDialog.projectId,
                        parentId: folderDialog.parentId ?? undefined,
                    });
                    setFolderDialog(null);
                }}
            />

            {/* Delete confirmation */}
            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {deleteTarget?.kind === "project" ? "project" : "folder"} &quot;
                            {deleteTarget?.name}&quot;?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget?.kind === "project"
                                ? "This will permanently delete the project and everything inside it."
                                : "This will permanently delete the folder and everything inside it."}
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
