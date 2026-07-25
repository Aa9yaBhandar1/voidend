import { describe, it, expect, beforeEach } from "vitest";
import { stripBasePath } from "~/lib/mock-path";
import { projectRouter } from "~/server/api/routers/project";
import { endpointRouter } from "~/server/api/routers/endpoint";
import { createRealCtx } from "./test-context";

describe("endpoint.resolve basePath stripping (integration)", () => {
    let ctx: ReturnType<typeof createRealCtx>;
    let projectCaller: ReturnType<typeof projectRouter.createCaller>;
    let endpointCaller: ReturnType<typeof endpointRouter.createCaller>;

    beforeEach(() => {
        ctx = createRealCtx();
        projectCaller = projectRouter.createCaller(ctx);
        endpointCaller = endpointRouter.createCaller(ctx);
    });

    it("resolves correctly when project has root basePath", async () => {
        const project = await projectCaller.create({ title: "Root", basePath: "/" });
        await endpointCaller.create({ name: "Users", projectId: project!.id, path: "/users" });

        const resolved = await endpointCaller.resolve({
            projectId: project!.id,
            method: "GET",
            path: "/users",
        });
        expect(resolved?.path).toBe("/users");
    });

    it("resolves correctly when the request path matches basePath + endpoint path", async () => {
        const project = await projectCaller.create({ title: "Scoped", basePath: "/api/v1" });
        await endpointCaller.create({ name: "Users", projectId: project!.id, path: "/users" });

        const resolved = await endpointCaller.resolve({
            projectId: project!.id,
            method: "GET",
            path: "/api/v1/users",
        });
        expect(resolved?.path).toBe("/users");
    });

    it("agrees with stripBasePath on an exact basePath match with no trailing segment", async () => {
        const project = await projectCaller.create({ title: "Scoped", basePath: "/api/v1" });
        const expected = stripBasePath("/api/v1", project!.basePath);
        expect(expected).toBe("/");
    });

    it("resolves correctly even when the request path shares a prefix but not a path boundary with basePath", async () => {
        const project = await projectCaller.create({ title: "Scoped", basePath: "/api" });
        await endpointCaller.create({ name: "X", projectId: project!.id, path: "/ary/foo" });

        const resolved = await endpointCaller.resolve({
            projectId: project!.id,
            method: "GET",
            path: "/apiary/foo",
        });
        expect(resolved).toBeNull();
    });

    it("returns null when the request path matches nothing, prefix or otherwise", async () => {
        const project = await projectCaller.create({ title: "Scoped", basePath: "/api/v1" });
        await endpointCaller.create({ name: "Users", projectId: project!.id, path: "/users" });

        const resolved = await endpointCaller.resolve({
            projectId: project!.id,
            method: "GET",
            path: "/orders",
        });
        expect(resolved).toBeNull();
    });

    it("resolves even without the basePath prefix, since both paths happen to coincide", async () => {
        const project = await projectCaller.create({ title: "Scoped", basePath: "/api/v1" });
        await endpointCaller.create({ name: "Users", projectId: project!.id, path: "/users" });

        const resolved = await endpointCaller.resolve({
            projectId: project!.id,
            method: "GET",
            path: "/users",
        });
        expect(resolved?.path).toBe("/users");
    });
});
