import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { TRPCError } from "@trpc/server";
import * as schema from "~/server/db/schema";
import { authConfigRouter } from "~/server/api/routers/auth-config";
import { eq } from "drizzle-orm";

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

    CREATE TABLE voidend_auth_configs (
      id TEXT PRIMARY KEY,
      endpointId TEXT NOT NULL REFERENCES voidend_endpoints(id) ON DELETE CASCADE,
      isLoginEndpoint INTEGER NOT NULL DEFAULT 0,
      requiresAuth INTEGER NOT NULL DEFAULT 0,
      tokenExpirySeconds INTEGER NOT NULL DEFAULT 3600,
      createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
      updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
    return { db, headers: new Headers() };
}

async function insertProject(db: ReturnType<typeof createCtx>["db"], overrides = {}) {
    const [project] = await db
        .insert(schema.projects_table)
        .values({ title: "P", secret: "test-secret", ...overrides })
        .returning();
    return project!;
}

async function insertEndpoint(
    db: ReturnType<typeof createCtx>["db"],
    projectId: string,
    overrides = {},
) {
    const [endpoint] = await db
        .insert(schema.endpoints_table)
        .values({ name: "Users", projectId, path: "/users", ...overrides })
        .returning();
    return endpoint!;
}

describe("authConfigRouter", () => {
    let ctx: ReturnType<typeof createCtx>;
    let caller: ReturnType<typeof authConfigRouter.createCaller>;
    let projectId: string;
    let endpointId: string;

    beforeEach(async () => {
        ctx = createCtx();
        caller = authConfigRouter.createCaller(ctx);
        projectId = (await insertProject(ctx.db)).id;
        endpointId = (await insertEndpoint(ctx.db, projectId)).id;
    });

    describe("upsert", () => {
        it("creates a new auth config", async () => {
            const config = await caller.upsert({ endpointId, requiresAuth: true });
            expect(config?.endpointId).toBe(endpointId);
            expect(config?.requiresAuth).toBe(true);
            expect(config?.isLoginEndpoint).toBe(false);
        });

        it("updates an existing config", async () => {
            const first = await caller.upsert({ endpointId, isLoginEndpoint: true });
            const second = await caller.upsert({
                endpointId,
                isLoginEndpoint: true,
                tokenExpirySeconds: 7200,
            });
            expect(first?.isLoginEndpoint).toBe(true);
            expect(second?.tokenExpirySeconds).toBe(7200);
        });

        it("rejects isLoginEndpoint and requiresAuth both true", async () => {
            await expect(
                caller.upsert({ endpointId, isLoginEndpoint: true, requiresAuth: true }),
            ).rejects.toThrow(TRPCError);
        });

        it("throws NOT_FOUND for a nonexistent endpoint", async () => {
            await expect(
                caller.upsert({ endpointId: crypto.randomUUID(), requiresAuth: true }),
            ).rejects.toThrow(TRPCError);
        });

        it("defaults isLoginEndpoint and requiresAuth to false", async () => {
            const config = await caller.upsert({ endpointId });
            expect(config?.isLoginEndpoint).toBe(false);
            expect(config?.requiresAuth).toBe(false);
        });
    });

    describe("getByEndpoint", () => {
        it("returns null when no config exists", async () => {
            expect(await caller.getByEndpoint({ endpointId })).toBeNull();
        });

        it("returns the config when one exists", async () => {
            await caller.upsert({ endpointId, requiresAuth: true });
            const config = await caller.getByEndpoint({ endpointId });
            expect(config?.requiresAuth).toBe(true);
        });

        it("scopes correctly across multiple endpoints", async () => {
            const other = await insertEndpoint(ctx.db, projectId, {
                path: "/login",
                method: "POST",
            });
            await caller.upsert({ endpointId, requiresAuth: true });
            await caller.upsert({ endpointId: other.id, isLoginEndpoint: true });

            const a = await caller.getByEndpoint({ endpointId });
            const b = await caller.getByEndpoint({ endpointId: other.id });
            expect(a?.requiresAuth).toBe(true);
            expect(b?.isLoginEndpoint).toBe(true);
        });
    });

    describe("delete", () => {
        it("removes the auth config", async () => {
            await caller.upsert({ endpointId, requiresAuth: true });
            await caller.delete({ endpointId });
            expect(await caller.getByEndpoint({ endpointId })).toBeNull();
        });

        it("is a no-op when no config exists", async () => {
            await expect(caller.delete({ endpointId })).resolves.not.toThrow();
        });

        it("cascade-deletes when the endpoint itself is deleted", async () => {
            await caller.upsert({ endpointId, requiresAuth: true });
            await ctx.db
                .delete(schema.endpoints_table)
                .where(eq(schema.endpoints_table.id, endpointId));
            expect(await caller.getByEndpoint({ endpointId })).toBeNull();
        });
    });
});
