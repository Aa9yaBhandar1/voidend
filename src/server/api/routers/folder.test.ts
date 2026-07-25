import { describe, it, expect, beforeEach, vi } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "~/server/db/schema";
import { folderRouter } from "~/server/api/routers/folder";

vi.mock("~/lib/endpoint-data-store", async (importOriginal) => {
    const actual = await importOriginal<typeof import("~/lib/endpoint-data-store")>();
    return {
        ...actual,
        invalidateEndpointData: vi.fn(),
    };
});
import { invalidateEndpointData } from "~/lib/endpoint-data-store";

function createCtx() {
    const sqlite = new Database(":memory:");
    const db = drizzle(sqlite, { schema });
    sqlite.exec(`
    CREATE TABLE voidend_projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      basePath TEXT NOT NULL DEFAULT '/',
      secret TEXT NOT NULL,
      createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
      updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE voidend_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      projectId TEXT NOT NULL REFERENCES voidend_projects(id) ON DELETE CASCADE,
      parentId TEXT REFERENCES voidend_folders(id) ON DELETE CASCADE,
      createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
      updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE voidend_endpoints (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      projectId TEXT NOT NULL REFERENCES voidend_projects(id) ON DELETE CASCADE,
      folderId TEXT REFERENCES voidend_folders(id) ON DELETE CASCADE,
      method TEXT NOT NULL DEFAULT 'GET',
      path TEXT NOT NULL,
      statusCode INTEGER NOT NULL DEFAULT 200,
      responseHeaders TEXT DEFAULT '{}',
      delayMs INTEGER NOT NULL DEFAULT 0,
      failureRate REAL NOT NULL DEFAULT 0,
      responseSchema TEXT NOT NULL DEFAULT '{}',
      responseCount INTEGER NOT NULL DEFAULT 1,
      errorSchema TEXT DEFAULT NULL,
      createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
      updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
    return { db, headers: new Headers() };
}

async function insertProject(db: ReturnType<typeof createCtx>["db"], title = "P") {
    const [project] = await db.insert(schema.projects_table).values({ title }).returning();
    return project!;
}

describe("folderRouter", () => {
    let ctx: ReturnType<typeof createCtx>;
    let caller: ReturnType<typeof folderRouter.createCaller>;
    let projectId: string;

    beforeEach(async () => {
        vi.clearAllMocks();
        ctx = createCtx();
        caller = folderRouter.createCaller(ctx);
        projectId = (await insertProject(ctx.db)).id;
    });

    describe("create", () => {
        it("creates a top-level folder", async () => {
            const folder = await caller.create({ name: "Root", projectId });
            expect(folder?.name).toBe("Root");
            expect(folder?.parentId).toBeNull();
        });

        it("creates a nested folder with parentId", async () => {
            const parent = await caller.create({ name: "Parent", projectId });
            const child = await caller.create({ name: "Child", projectId, parentId: parent!.id });
            expect(child?.parentId).toBe(parent!.id);
        });

        it("rejects empty name", async () => {
            await expect(caller.create({ name: "", projectId })).rejects.toThrow();
        });

        it("rejects invalid projectId", async () => {
            await expect(caller.create({ name: "X", projectId: "not-a-uuid" })).rejects.toThrow();
        });

        it("fails on nonexistent projectId (FK violation)", async () => {
            await expect(
                caller.create({ name: "X", projectId: crypto.randomUUID() }),
            ).rejects.toThrow();
        });
    });

    describe("update", () => {
        it("renames a folder", async () => {
            const folder = await caller.create({ name: "Old", projectId });
            const updated = await caller.update({ id: folder!.id, name: "New" });
            expect(updated?.name).toBe("New");
        });

        it("reparents a folder", async () => {
            const a = await caller.create({ name: "A", projectId });
            const b = await caller.create({ name: "B", projectId });
            const updated = await caller.update({ id: b!.id, parentId: a!.id });
            expect(updated?.parentId).toBe(a!.id);
        });

        it("clears parentId when explicitly set to null", async () => {
            const a = await caller.create({ name: "A", projectId });
            const b = await caller.create({ name: "B", projectId, parentId: a!.id });
            const updated = await caller.update({ id: b!.id, parentId: null });
            expect(updated?.parentId).toBeNull();
        });

        it("returns undefined when id not found", async () => {
            const updated = await caller.update({ id: crypto.randomUUID(), name: "X" });
            expect(updated).toBeUndefined();
        });
    });

    describe("delete", () => {
        it("deletes a leaf folder with no endpoints", async () => {
            const folder = await caller.create({ name: "Leaf", projectId });
            await caller.delete({ id: folder!.id });

            const remaining = await caller.getByProject({ projectId });
            expect(remaining).toHaveLength(0);
            expect(invalidateEndpointData).not.toHaveBeenCalled();
        });

        it("invalidates endpoints directly inside the deleted folder", async () => {
            const folder = await caller.create({ name: "Leaf", projectId });
            const [endpoint] = await ctx.db
                .insert(schema.endpoints_table)
                .values({ name: "E1", projectId, folderId: folder!.id, path: "/e1" })
                .returning();

            await caller.delete({ id: folder!.id });

            expect(invalidateEndpointData).toHaveBeenCalledWith(projectId, endpoint!.id);
        });

        it("invalidates endpoints in nested descendant folders", async () => {
            const parent = await caller.create({ name: "Parent", projectId });
            const child = await caller.create({ name: "Child", projectId, parentId: parent!.id });
            const grandchild = await caller.create({
                name: "Grandchild",
                projectId,
                parentId: child!.id,
            });
            const [endpoint] = await ctx.db
                .insert(schema.endpoints_table)
                .values({ name: "Deep", projectId, folderId: grandchild!.id, path: "/deep" })
                .returning();

            await caller.delete({ id: parent!.id });

            expect(invalidateEndpointData).toHaveBeenCalledWith(projectId, endpoint!.id);
            expect(invalidateEndpointData).toHaveBeenCalledTimes(1);
        });

        it("does not invalidate endpoints in sibling folders", async () => {
            const parent = await caller.create({ name: "Parent", projectId });
            const sibling = await caller.create({ name: "Sibling", projectId });
            const [endpoint] = await ctx.db
                .insert(schema.endpoints_table)
                .values({ name: "SiblingEndpoint", projectId, folderId: sibling!.id, path: "/s" })
                .returning();

            await caller.delete({ id: parent!.id });

            expect(invalidateEndpointData).not.toHaveBeenCalledWith(projectId, endpoint!.id);
        });

        it("is a no-op (does not throw) when folder does not exist", async () => {
            await expect(caller.delete({ id: crypto.randomUUID() })).resolves.not.toThrow();
            expect(invalidateEndpointData).not.toHaveBeenCalled();
        });
    });

    describe("getByProject", () => {
        it("returns folders for project sorted by name", async () => {
            await caller.create({ name: "Zebra", projectId });
            await caller.create({ name: "Apple", projectId });
            const folders = await caller.getByProject({ projectId });
            expect(folders.map((f) => f.name)).toEqual(["Apple", "Zebra"]);
        });

        it("does not return folders from other projects", async () => {
            const otherProject = await insertProject(ctx.db, "Other");
            await caller.create({ name: "Mine", projectId });
            await caller.create({ name: "Theirs", projectId: otherProject.id });
            const folders = await caller.getByProject({ projectId });
            expect(folders).toHaveLength(1);
            expect(folders[0]?.name).toBe("Mine");
        });

        it("returns empty array for project with no folders", async () => {
            const folders = await caller.getByProject({ projectId });
            expect(folders).toEqual([]);
        });
    });
});
