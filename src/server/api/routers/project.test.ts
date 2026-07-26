import { describe, it, expect, beforeEach, vi } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "~/server/db/schema";
import { projectRouter } from "~/server/api/routers/project";

vi.mock("~/lib/endpoint-data-store", async (importOriginal) => {
    const actual = await importOriginal<typeof import("~/lib/endpoint-data-store")>();
    return {
        ...actual,
        deleteProjectData: vi.fn(),
    };
});
import { deleteProjectData } from "~/lib/endpoint-data-store";

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
  `);
    return { db, headers: new Headers() };
}

describe("projectRouter", () => {
    let ctx: ReturnType<typeof createCtx>;
    let caller: ReturnType<typeof projectRouter.createCaller>;

    beforeEach(() => {
        vi.clearAllMocks();
        ctx = createCtx();
        caller = projectRouter.createCaller(ctx);
    });

    describe("create", () => {
        it("creates a project with defaults", async () => {
            const project = await caller.create({ title: "Test" });
            expect(project?.title).toBe("Test");
            expect(project?.basePath).toBe("/");
            expect(project?.secret).toBeTruthy();
        });

        it("creates a project with a custom secret", async () => {
            const project = await caller.create({ title: "Custom", secret: "custom-secret-key" });
            expect(project?.secret).toBe("custom-secret-key");
        });

        it("rejects empty title", async () => {
            await expect(caller.create({ title: "" })).rejects.toThrow();
        });
    });

    describe("getAll", () => {
        it("returns projects ordered by createdAt desc", async () => {
            await caller.create({ title: "First" });
            await new Promise((r) => setTimeout(r, 1100));
            await caller.create({ title: "Second" });
            const all = await caller.getAll();
            expect(all).toHaveLength(2);
            expect(all[0]?.title).toBe("Second");
        });

        it("returns empty array when none exist", async () => {
            expect(await caller.getAll()).toEqual([]);
        });
    });

    describe("getById", () => {
        it("returns project when found", async () => {
            const created = await caller.create({ title: "Findme" });
            const found = await caller.getById({ id: created!.id });
            expect(found?.id).toBe(created!.id);
            expect(found?.secret).toBe(created!.secret);
        });

        it("returns null when not found", async () => {
            const found = await caller.getById({ id: crypto.randomUUID() });
            expect(found).toBeNull();
        });

        it("rejects invalid uuid", async () => {
            await expect(caller.getById({ id: "not-a-uuid" })).rejects.toThrow();
        });
    });

    describe("update", () => {
        it("updates provided fields only", async () => {
            const created = await caller.create({ title: "Old", description: "d" });
            const updated = await caller.update({
                id: created!.id,
                title: "New",
                secret: "updated-secret",
            });
            expect(updated?.title).toBe("New");
            expect(updated?.description).toBe("d");
            expect(updated?.secret).toBe("updated-secret");
        });

        it("returns undefined when id not found", async () => {
            const updated = await caller.update({ id: crypto.randomUUID(), title: "X" });
            expect(updated).toBeUndefined();
        });
    });

    describe("delete", () => {
        it("removes project and calls deleteProjectData", async () => {
            const created = await caller.create({ title: "ToDelete" });
            await caller.delete({ id: created!.id });

            expect(deleteProjectData).toHaveBeenCalledWith(created!.id);
            expect(await caller.getById({ id: created!.id })).toBeNull();
        });

        it("calls deleteProjectData even if project id does not exist", async () => {
            const id = crypto.randomUUID();
            await caller.delete({ id });
            expect(deleteProjectData).toHaveBeenCalledWith(id);
        });
    });

    describe("exportProject and importProject", () => {
        beforeEach(() => {
            ctx.db.run(`
            CREATE TABLE IF NOT EXISTS voidend_folders (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              projectId TEXT NOT NULL,
              parentId TEXT,
              createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
              updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
            );
          `);
            ctx.db.run(`
            CREATE TABLE IF NOT EXISTS voidend_endpoints (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              projectId TEXT NOT NULL,
              folderId TEXT,
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
            ctx.db.run(`
            CREATE TABLE IF NOT EXISTS voidend_auth_configs (
              id TEXT PRIMARY KEY,
              endpointId TEXT NOT NULL,
              isLoginEndpoint INTEGER NOT NULL DEFAULT 0,
              requiresAuth INTEGER NOT NULL DEFAULT 0,
              tokenExpirySeconds INTEGER NOT NULL DEFAULT 3600,
              createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
              updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
            );
          `);
        });

        it("exports and imports a full project graph with folders, endpoints, schemas, and auth configs", async () => {
            const proj = await caller.create({
                title: "Original Project",
                description: "Test description",
                basePath: "/api/v1",
            });

            const parentFolderId = crypto.randomUUID();
            await ctx.db.insert(schema.folders_table).values({
                id: parentFolderId,
                name: "Parent Folder",
                projectId: proj!.id,
            });

            const childFolderId = crypto.randomUUID();
            await ctx.db.insert(schema.folders_table).values({
                id: childFolderId,
                name: "Child Folder",
                projectId: proj!.id,
                parentId: parentFolderId,
            });

            const endpointId = crypto.randomUUID();
            await ctx.db.insert(schema.endpoints_table).values({
                id: endpointId,
                name: "Get Users",
                projectId: proj!.id,
                folderId: childFolderId,
                method: "GET",
                path: "/users",
                statusCode: 200,
                responseSchema: { type: "array", items: { type: "string" } },
                responseCount: 5,
            });

            await ctx.db.insert(schema.auth_configs_table).values({
                endpointId: endpointId,
                isLoginEndpoint: false,
                requiresAuth: true,
                tokenExpirySeconds: 1800,
            });

            const exportedData = await caller.exportProject({ id: proj!.id });

            expect(exportedData.version).toBe("1.0");
            expect(exportedData.project.title).toBe("Original Project");
            expect(exportedData.folders).toHaveLength(2);
            expect(exportedData.endpoints).toHaveLength(1);
            expect(exportedData.endpoints[0]?.authConfig?.requiresAuth).toBe(true);

            const importResult = await caller.importProject(exportedData);

            expect(importResult.projectId).not.toBe(proj!.id);
            expect(importResult.foldersCreated).toBe(2);
            expect(importResult.endpointsCreated).toBe(1);

            const importedProj = await caller.getById({ id: importResult.projectId });
            expect(importedProj?.title).toBe("Original Project");
            expect(importedProj?.basePath).toBe("/api/v1");

            const importedFolders = await ctx.db.query.folders_table.findMany({
                where: (f, { eq }) => eq(f.projectId, importResult.projectId),
            });
            expect(importedFolders).toHaveLength(2);

            const importedEndpoints = await ctx.db.query.endpoints_table.findMany({
                where: (e, { eq }) => eq(e.projectId, importResult.projectId),
            });
            expect(importedEndpoints).toHaveLength(1);
            expect(importedEndpoints[0]?.name).toBe("Get Users");

            const importedAuthConfig = await ctx.db.query.auth_configs_table.findFirst({
                where: (a, { eq }) => eq(a.endpointId, importedEndpoints[0]!.id),
            });
            expect(importedAuthConfig?.requiresAuth).toBe(true);
            expect(importedAuthConfig?.tokenExpirySeconds).toBe(1800);
        });
    });
});
