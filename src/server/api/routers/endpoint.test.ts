import { describe, it, expect, beforeEach, vi } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { TRPCError } from "@trpc/server";
import * as schema from "~/server/db/schema";
import { endpointRouter } from "~/server/api/routers/endpoint";

vi.mock("~/lib/endpoint-data-store", async (importOriginal) => {
    const actual = await importOriginal<typeof import("~/lib/endpoint-data-store")>();
    return {
        ...actual,
        generateAndSaveData: vi.fn(),
        invalidateEndpointData: vi.fn(),
    };
});
import { generateAndSaveData, invalidateEndpointData } from "~/lib/endpoint-data-store";

function createCtx() {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
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

async function insertProject(db: ReturnType<typeof createCtx>["db"], overrides = {}) {
    const [project] = await db
        .insert(schema.projects_table)
        .values({ title: "P", ...overrides })
        .returning();
    return project!;
}

describe("endpointRouter", () => {
    let ctx: ReturnType<typeof createCtx>;
    let caller: ReturnType<typeof endpointRouter.createCaller>;
    let projectId: string;

    beforeEach(async () => {
        vi.clearAllMocks();
        ctx = createCtx();
        caller = endpointRouter.createCaller(ctx);
        projectId = (await insertProject(ctx.db)).id;
    });

    describe("create", () => {
        it("creates an endpoint with defaults", async () => {
            const endpoint = await caller.create({ name: "Users", projectId, path: "/users" });
            expect(endpoint?.method).toBe("GET");
            expect(endpoint?.statusCode).toBe(200);
            expect(endpoint?.responseCount).toBe(1);
        });

        it("calls generateAndSaveData after creation", async () => {
            const endpoint = await caller.create({ name: "Users", projectId, path: "/users" });
            expect(generateAndSaveData).toHaveBeenCalledWith(
                projectId,
                endpoint!.id,
                endpoint!.responseSchema,
                1,
            );
        });

        it("rejects duplicate method+path within the same project", async () => {
            await caller.create({ name: "A", projectId, path: "/users", method: "GET" });
            await expect(
                caller.create({ name: "B", projectId, path: "/users", method: "GET" }),
            ).rejects.toThrow(TRPCError);
        });

        it("allows same path with a different method", async () => {
            await caller.create({ name: "A", projectId, path: "/users", method: "GET" });
            const endpoint = await caller.create({
                name: "B",
                projectId,
                path: "/users",
                method: "POST",
            });
            expect(endpoint?.method).toBe("POST");
        });

        it("allows same method+path across different projects", async () => {
            const otherProject = await insertProject(ctx.db, { title: "Other" });
            await caller.create({ name: "A", projectId, path: "/users" });
            const endpoint = await caller.create({
                name: "A",
                projectId: otherProject.id,
                path: "/users",
            });
            expect(endpoint).toBeTruthy();
        });

        it("rejects invalid statusCode", async () => {
            await expect(
                caller.create({ name: "X", projectId, path: "/x", statusCode: 999 }),
            ).rejects.toThrow();
        });

        it("rejects empty path", async () => {
            await expect(caller.create({ name: "X", projectId, path: "" })).rejects.toThrow();
        });

        it("fails on nonexistent projectId (FK violation)", async () => {
            await expect(
                caller.create({ name: "X", projectId: crypto.randomUUID(), path: "/x" }),
            ).rejects.toThrow();
        });
    });

    describe("getByProject", () => {
        it("returns endpoints sorted by path then method", async () => {
            await caller.create({ name: "B", projectId, path: "/b" });
            await caller.create({ name: "A2", projectId, path: "/a", method: "POST" });
            await caller.create({ name: "A1", projectId, path: "/a", method: "GET" });
            const endpoints = await caller.getByProject({ projectId });
            expect(endpoints.map((e) => [e.path, e.method])).toEqual([
                ["/a", "GET"],
                ["/a", "POST"],
                ["/b", "GET"],
            ]);
        });

        it("returns empty array when project has no endpoints", async () => {
            expect(await caller.getByProject({ projectId })).toEqual([]);
        });
    });

    describe("getByFolder", () => {
        it("returns only endpoints in the given folder", async () => {
            const [folder] = await ctx.db
                .insert(schema.folders_table)
                .values({ name: "F", projectId })
                .returning();
            await caller.create({ name: "In", projectId, path: "/in", folderId: folder!.id });
            await caller.create({ name: "Out", projectId, path: "/out" });

            const endpoints = await caller.getByFolder({ folderId: folder!.id });
            expect(endpoints).toHaveLength(1);
            expect(endpoints[0]?.name).toBe("In");
        });
    });

    describe("getById", () => {
        it("returns the endpoint when found", async () => {
            const created = await caller.create({ name: "X", projectId, path: "/x" });
            const found = await caller.getById({ id: created!.id });
            expect(found?.id).toBe(created!.id);
        });

        it("returns null when not found", async () => {
            expect(await caller.getById({ id: crypto.randomUUID() })).toBeNull();
        });
    });

    describe("update", () => {
        it("updates a non-conflicting field without regeneration", async () => {
            const created = await caller.create({ name: "X", projectId, path: "/x" });
            vi.clearAllMocks();
            const updated = await caller.update({ id: created!.id, name: "Renamed" });
            expect(updated?.name).toBe("Renamed");
            expect(generateAndSaveData).not.toHaveBeenCalled();
            expect(invalidateEndpointData).not.toHaveBeenCalled();
        });

        it("regenerates data when responseSchema changes", async () => {
            const created = await caller.create({ name: "X", projectId, path: "/x" });
            await caller.update({ id: created!.id, responseSchema: { name: "string" } });
            expect(invalidateEndpointData).toHaveBeenCalledWith(projectId, created!.id);
            expect(generateAndSaveData).toHaveBeenCalledWith(
                projectId,
                created!.id,
                { name: "string" },
                1,
            );
        });

        it("regenerates data when responseCount changes", async () => {
            const created = await caller.create({ name: "X", projectId, path: "/x" });
            await caller.update({ id: created!.id, responseCount: 5 });
            expect(invalidateEndpointData).toHaveBeenCalledWith(projectId, created!.id);
            expect(generateAndSaveData).toHaveBeenCalled();
        });

        it("throws NOT_FOUND when changing method/path on a missing endpoint", async () => {
            await expect(caller.update({ id: crypto.randomUUID(), path: "/new" })).rejects.toThrow(
                TRPCError,
            );
        });

        it("rejects rename that conflicts with another endpoint's method+path", async () => {
            await caller.create({ name: "A", projectId, path: "/a", method: "GET" });
            const b = await caller.create({ name: "B", projectId, path: "/b", method: "GET" });
            await expect(caller.update({ id: b!.id, path: "/a" })).rejects.toThrow(TRPCError);
        });

        it("allows updating path to its own current value", async () => {
            const created = await caller.create({
                name: "A",
                projectId,
                path: "/a",
                method: "GET",
            });
            const updated = await caller.update({ id: created!.id, path: "/a" });
            expect(updated?.path).toBe("/a");
        });

        it("allows clearing folderId to null", async () => {
            const [folder] = await ctx.db
                .insert(schema.folders_table)
                .values({ name: "F", projectId })
                .returning();
            const created = await caller.create({
                name: "X",
                projectId,
                path: "/x",
                folderId: folder!.id,
            });
            const updated = await caller.update({ id: created!.id, folderId: null });
            expect(updated?.folderId).toBeNull();
        });
    });

    describe("delete", () => {
        it("removes the endpoint and invalidates its data", async () => {
            const created = await caller.create({ name: "X", projectId, path: "/x" });
            vi.clearAllMocks();
            await caller.delete({ id: created!.id });

            expect(invalidateEndpointData).toHaveBeenCalledWith(projectId, created!.id);
            expect(await caller.getById({ id: created!.id })).toBeNull();
        });

        it("does not call invalidateEndpointData when endpoint does not exist", async () => {
            await caller.delete({ id: crypto.randomUUID() });
            expect(invalidateEndpointData).not.toHaveBeenCalled();
        });
    });

    describe("resolve", () => {
        it("resolves an endpoint at root basePath", async () => {
            await caller.create({ name: "Users", projectId, path: "/users", method: "GET" });
            const resolved = await caller.resolve({ projectId, method: "GET", path: "/users" });
            expect(resolved?.path).toBe("/users");
        });

        it("strips a non-root basePath before matching", async () => {
            const scoped = await insertProject(ctx.db, { title: "Scoped", basePath: "/api/v1" });
            await caller.create({ name: "Users", projectId: scoped.id, path: "/users" });

            const resolved = await caller.resolve({
                projectId: scoped.id,
                method: "GET",
                path: "/api/v1/users",
            });
            expect(resolved?.path).toBe("/users");
        });

        it("returns null when project does not exist", async () => {
            const resolved = await caller.resolve({
                projectId: crypto.randomUUID(),
                method: "GET",
                path: "/x",
            });
            expect(resolved).toBeNull();
        });

        it("returns null when no endpoint matches path+method", async () => {
            await caller.create({ name: "Users", projectId, path: "/users", method: "GET" });
            const resolved = await caller.resolve({ projectId, method: "POST", path: "/users" });
            expect(resolved).toBeNull();
        });
    });
});
