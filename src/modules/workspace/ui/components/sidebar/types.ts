export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface Endpoint {
    id: string;
    name: string;
    method: HttpMethod;
    folderId?: string | null;
    authConfig?: {
        isLoginEndpoint?: boolean;
        requiresAuth?: boolean;
        tokenExpirySeconds?: number;
    } | null;
}

export interface Collection {
    id: string;
    name: string;
    children?: Collection[];
    endpoints?: Endpoint[];
}

export type FolderRow = {
    id: string;
    name: string;
    projectId: string;
    parentId: string | null;
};

export type ModalTarget =
    | { kind: "project"; projectId?: never; parentId?: never; folderId?: never }
    | { kind: "importProject"; projectId?: never; parentId?: never; folderId?: never }
    | { kind: "projectSettings"; projectId: string; parentId?: never; folderId?: never }
    | { kind: "folder"; projectId: string; parentId?: string }
    | { kind: "endpoint"; projectId: string; folderId?: string };

export type SidebarProject = {
    id: string;
    title: string;
};

export function buildFolderTree(
    folders: FolderRow[],
    parentId: string | null = null,
): Collection[] {
    return folders
        .filter((f) => f.parentId === parentId)
        .map((f) => ({
            id: f.id,
            name: f.name,
            children: buildFolderTree(folders, f.id),
            endpoints: [],
        }));
}
