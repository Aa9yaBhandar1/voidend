import fs from "fs";
import path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDataDir } from "~/lib/endpoint-data-store";
import { projectRouter } from "~/server/api/routers/project";
import { folderRouter } from "~/server/api/routers/folder";
import { endpointRouter } from "~/server/api/routers/endpoint";
import { createRealCtx, setupIsolatedDataDir } from "./test-context";

describe("project lifecycle (integration, real fs + real db)", () => {
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

    it("writes a data file to disk when an endpoint is created", async () => {
        const project = await projectCaller.create({ title: "Test Project" });
        const folder = await folderCaller.create({ name: "Users", projectId: project!.id });
        const endpoint = await endpointCaller.create({
            name: "List users",
            projectId: project!.id,
            folderId: folder!.id,
            path: "/users",
            responseSchema: { id: "$faker.string.uuid", name: "$faker.person.fullName" },
            responseCount: 3,
        });

        const filePath = path.join(getDataDir(), project!.id, `${endpoint!.id}.json`);
        expect(fs.existsSync(filePath)).toBe(true);

        const contents = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        expect(contents).toHaveLength(3);
        expect(contents[0]).toHaveProperty("id");
        expect(contents[0]).toHaveProperty("name");
    });

    it("regenerates the data file with new content when responseSchema is updated", async () => {
        const project = await projectCaller.create({ title: "Test Project" });
        // responseCount defaults to 1, so resolveResponseData returns a single
        // object here, not a 1-element array.
        const endpoint = await endpointCaller.create({
            name: "List users",
            projectId: project!.id,
            path: "/users",
            responseSchema: { id: "$faker.string.uuid" },
        });

        const filePath = path.join(getDataDir(), project!.id, `${endpoint!.id}.json`);
        const before = fs.readFileSync(filePath, "utf-8");

        await endpointCaller.update({
            id: endpoint!.id,
            responseSchema: { id: "$faker.string.uuid", email: "$faker.internet.email" },
        });

        const after = fs.readFileSync(filePath, "utf-8");
        expect(after).not.toBe(before);
        const parsed = JSON.parse(after);
        expect(parsed).toHaveProperty("email");
    });

    it("returns an array (not a bare object) when responseCount is greater than 1", async () => {
        const project = await projectCaller.create({ title: "Test Project" });
        const endpoint = await endpointCaller.create({
            name: "List users",
            projectId: project!.id,
            path: "/users",
            responseSchema: { id: "$faker.string.uuid" },
            responseCount: 5,
        });

        const filePath = path.join(getDataDir(), project!.id, `${endpoint!.id}.json`);
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed).toHaveLength(5);
    });

    it("removes the data file when an endpoint is deleted", async () => {
        const project = await projectCaller.create({ title: "Test Project" });
        const endpoint = await endpointCaller.create({
            name: "List users",
            projectId: project!.id,
            path: "/users",
        });
        const filePath = path.join(getDataDir(), project!.id, `${endpoint!.id}.json`);
        expect(fs.existsSync(filePath)).toBe(true);

        await endpointCaller.delete({ id: endpoint!.id });
        expect(fs.existsSync(filePath)).toBe(false);
    });

    it("wipes the whole project data directory when the project is deleted", async () => {
        const project = await projectCaller.create({ title: "Test Project" });
        const endpointA = await endpointCaller.create({
            name: "A",
            projectId: project!.id,
            path: "/a",
        });
        const endpointB = await endpointCaller.create({
            name: "B",
            projectId: project!.id,
            path: "/b",
        });

        const projectDir = path.join(getDataDir(), project!.id);
        expect(fs.existsSync(path.join(projectDir, `${endpointA!.id}.json`))).toBe(true);
        expect(fs.existsSync(path.join(projectDir, `${endpointB!.id}.json`))).toBe(true);

        await projectCaller.delete({ id: project!.id });

        expect(fs.existsSync(projectDir)).toBe(false);
    });

    it("does not touch other projects' data directories on delete", async () => {
        const projectA = await projectCaller.create({ title: "A" });
        const projectB = await projectCaller.create({ title: "B" });
        const endpointB = await endpointCaller.create({
            name: "B endpoint",
            projectId: projectB!.id,
            path: "/b",
        });

        await projectCaller.delete({ id: projectA!.id });

        const bFilePath = path.join(getDataDir(), projectB!.id, `${endpointB!.id}.json`);
        expect(fs.existsSync(bFilePath)).toBe(true);
    });
});
