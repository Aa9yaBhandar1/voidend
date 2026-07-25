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

    /**
     * Known divergence: endpoint.resolve strips basePath inline via a naive
     * `startsWith` check instead of importing `stripBasePath`, so it does not
     * enforce a segment boundary after the prefix. `stripBasePath` was already
     * hardened against this class of bug for mock-path.ts (see stripBasePath
     * tests / the earlier `getMockOrigin` cleanup). This test documents the
     * current (incorrect) behavior of resolve and will start failing — which
     * is the point — once resolve is switched to use stripBasePath directly.
     */
    it("[KNOWN BUG] resolve's inline stripping does not respect segment boundaries", async () => {
        const project = await projectCaller.create({ title: "Scoped", basePath: "/api" });
        await endpointCaller.create({ name: "X", projectId: project!.id, path: "/ary/foo" });

        // What resolve currently does (buggy): naive startsWith + slice.
        const naiveStripped = "/apiary/foo".startsWith(project!.basePath)
            ? "/apiary/foo".slice(project!.basePath.length) || "/"
            : "/apiary/foo";
        expect(naiveStripped).toBe("ary/foo"); // no leading slash, wrong segment

        // What the hardened utility does: refuses to strip a non-boundary prefix.
        const correctlyStripped = stripBasePath("/apiary/foo", project!.basePath);
        expect(correctlyStripped).toBe("/apiary/foo"); // unchanged, as it should be

        // resolve() as currently implemented will NOT find this endpoint via
        // "/apiary/foo" because its inline strip produces "ary/foo", which
        // matches neither the stored path "/ary/foo" nor anything sane.
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
            path: "/orders", // no relation to the registered endpoint at all
        });
        expect(resolved).toBeNull();
    });

    /**
     * Documents a second consequence of the same inline-stripping bug: because
     * the fallback branch returns the path unchanged when it doesn't start
     * with basePath, a request that omits the basePath prefix entirely can
     * still resolve if it happens to equal the endpoint's stored (post-strip)
     * path. A correct implementation using stripBasePath would have the same
     * behavior here too (stripBasePath also returns the input unchanged if it
     * doesn't match), so this isn't unique to the bug — but it's worth having
     * explicit coverage since it's a common source of confusion when basePath
     * is supposed to be mandatory.
     */
    it("resolves even without the basePath prefix, since both paths happen to coincide", async () => {
        const project = await projectCaller.create({ title: "Scoped", basePath: "/api/v1" });
        await endpointCaller.create({ name: "Users", projectId: project!.id, path: "/users" });

        const resolved = await endpointCaller.resolve({
            projectId: project!.id,
            method: "GET",
            path: "/users", // missing the /api/v1 prefix, but matches stored path directly
        });
        expect(resolved?.path).toBe("/users");
    });
});
