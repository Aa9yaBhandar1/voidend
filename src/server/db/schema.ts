import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { index, sqliteTableCreator } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import crypto from "node:crypto";

export const createTable = sqliteTableCreator((name) => `voidend_${name}`);

export const projects_table = createTable(
    "projects",
    (d) => ({
        id: d
            .text()
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        title: d.text().notNull(),
        description: d.text(),
        basePath: d.text().notNull().default("/"),
        secret: d
            .text()
            .notNull()
            .$defaultFn(() => crypto.randomBytes(32).toString("hex")),
        createdAt: d
            .integer({ mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`),
        updatedAt: d
            .integer({ mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`)
            .$onUpdate(() => new Date()),
    }),
    (t) => [index("project_title_idx").on(t.title)],
);

export const folders_table = createTable(
    "folders",
    (d) => ({
        id: d
            .text()
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        name: d.text().notNull(),
        projectId: d
            .text()
            .notNull()
            .references(() => projects_table.id, { onDelete: "cascade" }),
        parentId: d
            .text()
            .references((): AnySQLiteColumn => folders_table.id, { onDelete: "cascade" }),
        createdAt: d
            .integer({ mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`),
        updatedAt: d
            .integer({ mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`)
            .$onUpdate(() => new Date()),
    }),
    (t) => [index("folder_project_idx").on(t.projectId), index("folder_parent_idx").on(t.parentId)],
);

export const endpoints_table = createTable(
    "endpoints",
    (d) => ({
        id: d
            .text()
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        name: d.text().notNull(),
        projectId: d
            .text()
            .notNull()
            .references(() => projects_table.id, { onDelete: "cascade" }),
        folderId: d.text().references(() => folders_table.id, { onDelete: "cascade" }),
        method: d
            .text({ enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] })
            .notNull()
            .default("GET"),
        path: d.text().notNull(),
        statusCode: d.integer().notNull().default(200),
        responseHeaders: d.text({ mode: "json" }).default({}),
        delayMs: d.integer().notNull().default(0),
        failureRate: d.real().notNull().default(0),
        responseSchema: d.text({ mode: "json" }).notNull().default({}),
        responseCount: d.integer().notNull().default(1),
        errorSchema: d.text({ mode: "json" }).default(null),
        createdAt: d
            .integer({ mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`),
        updatedAt: d
            .integer({ mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`)
            .$onUpdate(() => new Date()),
    }),
    (t) => [
        index("endpoint_project_idx").on(t.projectId),
        index("endpoint_folder_idx").on(t.folderId),
        index("endpoint_path_idx").on(t.projectId, t.method, t.path),
    ],
);

export const auth_configs_table = createTable(
    "auth_configs",
    (d) => ({
        id: d
            .text()
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        endpointId: d
            .text()
            .notNull()
            .references(() => endpoints_table.id, { onDelete: "cascade" }),
        isLoginEndpoint: d.integer({ mode: "boolean" }).notNull().default(false),
        requiresAuth: d.integer({ mode: "boolean" }).notNull().default(false),
        tokenExpirySeconds: d.integer().notNull().default(3600),
        createdAt: d
            .integer({ mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`),
        updatedAt: d
            .integer({ mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`)
            .$onUpdate(() => new Date()),
    }),
    (t) => [index("auth_config_endpoint_idx").on(t.endpointId)],
);
