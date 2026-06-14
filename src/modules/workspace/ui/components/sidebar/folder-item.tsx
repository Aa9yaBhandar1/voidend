import type { Collection } from "./endpoint-item";

export type FolderRow = {
    id: string;
    name: string;
    projectId: string;
    parentId: string | null;
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
