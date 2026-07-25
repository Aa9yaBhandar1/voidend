import fs from "fs";
import os from "os";
import path from "path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "~/server/db/schema";
import { isolatePlatformEnv } from "~/lib/test-helpers/isolate-platform";

export function createRealCtx() {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    const db = drizzle(sqlite, { schema });
    sqlite.exec(`
    CREATE TABLE voidend_projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      basePath TEXT NOT NULL DEFAULT '/',
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

export async function insertProject(
    db: ReturnType<typeof createRealCtx>["db"],
    overrides: Partial<{ title: string; basePath: string }> = {},
) {
    const [project] = await db
        .insert(schema.projects_table)
        .values({ title: "P", ...overrides })
        .returning();
    return project!;
}

export function setupIsolatedDataDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "voidend-test-"));
    const platformEnv = isolatePlatformEnv();
    platformEnv.setPlatform("linux");
    process.env.XDG_DATA_HOME = dir;

    return {
        dir,
        cleanup: () => {
            fs.rmSync(dir, { recursive: true, force: true });
            platformEnv.restore();
        },
    };
}
