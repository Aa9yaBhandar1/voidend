import fs from "fs";
import path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { getDataDir } from "~/lib/endpoint-data-store";
import * as schema from "~/server/db/schema";
import { projectRouter } from "~/server/api/routers/project";
import { folderRouter } from "~/server/api/routers/folder";
import { endpointRouter } from "~/server/api/routers/endpoint";
import { createRealCtx, setupIsolatedDataDir } from "./test-context";

describe("folder cascade delete (integration, real db + real fs)", () => {
    let ctx: ReturnType<typeof createRealCtx>;
    let isolated: ReturnType<typeof setupIsolatedDataDir>;
    let projectCaller: ReturnType<typeof projectRouter.createCaller>;
    let folderCaller: ReturnType<typeof folderRouter.createCaller>;
    let endpointCaller: ReturnType<typeof endpointRouter.createCaller>;

    beforeEach(() => {
        isolated = setupIsolatedDataDir();
        ctx = createRealCtx();
        projectCaller = projectRouter.createCaller(ctx);
        folderCaller = folderRouter.createCaller(ctx);
        endpointCaller = endpointRouter.createCaller(ctx);
    });

    afterEach(() => {
        isolated.cleanup();
    });

    it("removes nested folders and their endpoints from the db via FK cascade", async () => {
        const project = await projectCaller.create({ title: "P" });
        const parent = await folderCaller.create({ name: "Parent", projectId: project!.id });
        const child = await folderCaller.create({
            name: "Child",
            projectId: project!.id,
            parentId: parent!.id,
        });
        const grandchild = await folderCaller.create({
            name: "Grandchild",
            projectId: project!.id,
            parentId: child!.id,
        });
        const endpoint = await endpointCaller.create({
            name: "Deep",
            projectId: project!.id,
            folderId: grandchild!.id,
            path: "/deep",
        });

        await folderCaller.delete({ id: parent!.id });

        const remainingFolders = await ctx.db.query.folders_table.findMany({
            where: (f, { eq }) => eq(f.projectId, project!.id),
        });
        expect(remainingFolders).toHaveLength(0);

        const remainingEndpoint = await ctx.db.query.endpoints_table.findFirst({
            where: (e, { eq }) => eq(e.id, endpoint!.id),
        });
        expect(remainingEndpoint).toBeUndefined();
    });

    it("does not cascade-delete sibling folders or their endpoints", async () => {
        const project = await projectCaller.create({ title: "P" });
        const target = await folderCaller.create({ name: "Target", projectId: project!.id });
        const sibling = await folderCaller.create({ name: "Sibling", projectId: project!.id });
        const siblingEndpoint = await endpointCaller.create({
            name: "Sibling endpoint",
            projectId: project!.id,
            folderId: sibling!.id,
            path: "/sibling",
        });

        await folderCaller.delete({ id: target!.id });

        const remainingFolder = await ctx.db.query.folders_table.findFirst({
            where: (f, { eq }) => eq(f.id, sibling!.id),
        });
        expect(remainingFolder).toBeDefined();

        const remainingEndpoint = await ctx.db.query.endpoints_table.findFirst({
            where: (e, { eq }) => eq(e.id, siblingEndpoint!.id),
        });
        expect(remainingEndpoint).toBeDefined();
    });

    it("removes on-disk data files for every endpoint under a deleted folder tree", async () => {
        const project = await projectCaller.create({ title: "P" });
        const parent = await folderCaller.create({ name: "Parent", projectId: project!.id });
        const child = await folderCaller.create({
            name: "Child",
            projectId: project!.id,
            parentId: parent!.id,
        });

        const inParent = await endpointCaller.create({
            name: "InParent",
            projectId: project!.id,
            folderId: parent!.id,
            path: "/in-parent",
        });
        const inChild = await endpointCaller.create({
            name: "InChild",
            projectId: project!.id,
            folderId: child!.id,
            path: "/in-child",
        });
        const outside = await endpointCaller.create({
            name: "Outside",
            projectId: project!.id,
            path: "/outside",
        });

        const dataDir = path.join(getDataDir(), project!.id);
        const parentFile = path.join(dataDir, `${inParent!.id}.json`);
        const childFile = path.join(dataDir, `${inChild!.id}.json`);
        const outsideFile = path.join(dataDir, `${outside!.id}.json`);

        expect(fs.existsSync(parentFile)).toBe(true);
        expect(fs.existsSync(childFile)).toBe(true);
        expect(fs.existsSync(outsideFile)).toBe(true);

        await folderCaller.delete({ id: parent!.id });

        expect(fs.existsSync(parentFile)).toBe(false);
        expect(fs.existsSync(childFile)).toBe(false);
        expect(fs.existsSync(outsideFile)).toBe(true);
    });

    it("leaves the folder itself deleted even if it has no endpoints", async () => {
        const project = await projectCaller.create({ title: "P" });
        const empty = await folderCaller.create({ name: "Empty", projectId: project!.id });

        await folderCaller.delete({ id: empty!.id });

        const remaining = await ctx.db.query.folders_table.findFirst({
            where: (f, { eq }) => eq(f.id, empty!.id),
        });
        expect(remaining).toBeUndefined();
    });

    it("deleting a project cascades through folders and endpoints in the db too", async () => {
        const project = await projectCaller.create({ title: "P" });
        const folder = await folderCaller.create({ name: "F", projectId: project!.id });
        const endpoint = await endpointCaller.create({
            name: "E",
            projectId: project!.id,
            folderId: folder!.id,
            path: "/e",
        });

        await projectCaller.delete({ id: project!.id });

        const remainingFolder = await ctx.db
            .select()
            .from(schema.folders_table)
            .where(eq(schema.folders_table.id, folder!.id));
        expect(remainingFolder).toHaveLength(0);

        const remainingEndpoint = await ctx.db
            .select()
            .from(schema.endpoints_table)
            .where(eq(schema.endpoints_table.id, endpoint!.id));
        expect(remainingEndpoint).toHaveLength(0);
    });
});
