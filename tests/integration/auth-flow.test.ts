import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { projectRouter } from "~/server/api/routers/project";
import { endpointRouter } from "~/server/api/routers/endpoint";
import { authConfigRouter } from "~/server/api/routers/auth-config";
import { createRealCtx, setupIsolatedDataDir } from "./test-context";
import { POST, GET } from "~/app/mock/[projectId]/[...path]/route";

vi.mock("~/server/db", () => ({
    db: {
        query: {
            projects_table: {
                findFirst: vi.fn(),
            },
            endpoints_table: {
                findMany: vi.fn(),
            },
            auth_configs_table: {
                findFirst: vi.fn(),
            },
        },
    },
}));

import { db } from "~/server/db";

describe("mock auth flow integration", () => {
    let ctx: ReturnType<typeof createRealCtx>;
    let isolated: ReturnType<typeof setupIsolatedDataDir>;
    let projectCaller: ReturnType<typeof projectRouter.createCaller>;
    let endpointCaller: ReturnType<typeof endpointRouter.createCaller>;
    let authConfigCaller: ReturnType<typeof authConfigRouter.createCaller>;

    beforeEach(() => {
        isolated = setupIsolatedDataDir();
        ctx = createRealCtx();
        projectCaller = projectRouter.createCaller(ctx);
        endpointCaller = endpointRouter.createCaller(ctx);
        authConfigCaller = authConfigRouter.createCaller(ctx);
    });

    afterEach(() => {
        isolated.cleanup();
    });

    it("issues token on login endpoint and authorizes protected endpoint", async () => {
        const project = await projectCaller.create({ title: "Auth Project" });
        const loginEndpoint = await endpointCaller.create({
            name: "Login",
            projectId: project!.id,
            method: "POST",
            path: "/login",
            responseSchema: { status: "ok" },
        });
        const userEndpoint = await endpointCaller.create({
            name: "User Profile",
            projectId: project!.id,
            method: "GET",
            path: "/user",
            responseSchema: { id: "123", name: "Alice" },
        });

        await authConfigCaller.upsert({
            endpointId: loginEndpoint!.id,
            isLoginEndpoint: true,
        });

        await authConfigCaller.upsert({
            endpointId: userEndpoint!.id,
            requiresAuth: true,
        });

        vi.mocked(db.query.projects_table.findFirst).mockImplementation((async ({ where }: any) => {
            return ctx.db.query.projects_table.findFirst({ where });
        }) as any);
        vi.mocked(db.query.endpoints_table.findMany).mockImplementation((async ({ where }: any) => {
            return ctx.db.query.endpoints_table.findMany({ where });
        }) as any);
        vi.mocked(db.query.auth_configs_table.findFirst).mockImplementation((async ({
            where,
        }: any) => {
            return ctx.db.query.auth_configs_table.findFirst({ where });
        }) as any);

        const loginReq = new NextRequest(`http://localhost/mock/${project!.id}/login`, {
            method: "POST",
        });
        const loginRes = await POST(loginReq, {
            params: { projectId: project!.id, path: ["login"] },
        });
        expect(loginRes.status).toBe(200);

        const loginData = await loginRes.json();
        expect(loginData).toHaveProperty("token");
        expect(loginData).toHaveProperty("data");
        expect(loginData.data).toEqual({ status: "ok" });

        const unauthReq = new NextRequest(`http://localhost/mock/${project!.id}/user`, {
            method: "GET",
        });
        const unauthRes = await GET(unauthReq, {
            params: { projectId: project!.id, path: ["user"] },
        });
        expect(unauthRes.status).toBe(401);
        const unauthBody = await unauthRes.json();
        expect(unauthBody.error).toBe("Missing token");

        const invalidReq = new NextRequest(`http://localhost/mock/${project!.id}/user`, {
            method: "GET",
            headers: {
                authorization: "Bearer invalid.jwt.token",
            },
        });
        const invalidRes = await GET(invalidReq, {
            params: { projectId: project!.id, path: ["user"] },
        });
        expect(invalidRes.status).toBe(401);
        const invalidBody = await invalidRes.json();
        expect(invalidBody.error).toBe("Invalid or expired token");

        const authReq = new NextRequest(`http://localhost/mock/${project!.id}/user`, {
            method: "GET",
            headers: {
                authorization: `Bearer ${loginData.token}`,
            },
        });
        const authRes = await GET(authReq, {
            params: { projectId: project!.id, path: ["user"] },
        });
        expect(authRes.status).toBe(200);
        const authData = await authRes.json();
        expect(authData).toEqual({ id: "123", name: "Alice" });
    });
});
