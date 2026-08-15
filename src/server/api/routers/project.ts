import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import z from "zod";
import { projects_table } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { deleteProjectData } from "~/lib/endpoint-data-store";

export const projectRouter = createTRPCRouter({
    create: publicProcedure
        .input(
            z.object({
                title: z.string().min(1),
                description: z.string().optional(),
                basePath: z.string().default("/"),
                secret: z.string().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const [project] = await ctx.db.insert(projects_table).values(input).returning();
            return project;
        }),

    getAll: publicProcedure.query(async ({ ctx }) => {
        return ctx.db.query.projects_table.findMany({
            orderBy: (p, { desc }) => [desc(p.createdAt)],
        });
    }),

    getById: publicProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
            const project = await ctx.db.query.projects_table.findFirst({
                where: (p, { eq }) => eq(p.id, input.id),
            });

            return project ?? null;
        }),

    update: publicProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                title: z.string().min(1).optional(),
                description: z.string().optional(),
                basePath: z.string().optional(),
                secret: z.string().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            const [updated] = await ctx.db
                .update(projects_table)
                .set(data)
                .where(eq(projects_table.id, id))
                .returning();
            return updated;
        }),

    delete: publicProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            deleteProjectData(input.id);
            await ctx.db.delete(projects_table).where(eq(projects_table.id, input.id));
        }),

    exportProject: publicProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
            const { TRPCError } = await import("@trpc/server");

            const project = await ctx.db.query.projects_table.findFirst({
                where: (p, { eq }) => eq(p.id, input.id),
            });

            if (!project) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
            }

            const folders = await ctx.db.query.folders_table.findMany({
                where: (f, { eq }) => eq(f.projectId, input.id),
                orderBy: (f, { asc }) => [asc(f.createdAt)],
            });

            const endpoints = await ctx.db.query.endpoints_table.findMany({
                where: (e, { eq }) => eq(e.projectId, input.id),
                orderBy: (e, { asc }) => [asc(e.createdAt)],
            });

            const endpointIds = endpoints.map((e) => e.id);
            const authConfigs =
                endpointIds.length > 0
                    ? await ctx.db.query.auth_configs_table.findMany({
                          where: (a, { inArray }) => inArray(a.endpointId, endpointIds),
                      })
                    : [];
            const authConfigMap = new Map(authConfigs.map((a) => [a.endpointId, a]));

            return {
                version: "1.0" as const,
                exportedAt: new Date().toISOString(),
                project: {
                    title: project.title,
                    description: project.description ?? null,
                    basePath: project.basePath,
                    secret: project.secret,
                },
                folders: folders.map((f) => ({
                    _ref: f.id,
                    name: f.name,
                    parentRef: f.parentId ?? null,
                })),
                endpoints: endpoints.map((e) => {
                    const auth = authConfigMap.get(e.id);
                    return {
                        _ref: e.id,
                        name: e.name,
                        folderRef: e.folderId ?? null,
                        method: e.method,
                        path: e.path,
                        statusCode: e.statusCode,
                        responseHeaders: (e.responseHeaders as Record<string, string> | null) ?? {},
                        delayMs: e.delayMs,
                        failureRate: e.failureRate,
                        responseSchema: e.responseSchema as Record<string, unknown>,
                        responseCount: e.responseCount,
                        authConfig: auth
                            ? {
                                  isLoginEndpoint: auth.isLoginEndpoint,
                                  requiresAuth: auth.requiresAuth,
                                  tokenExpirySeconds: auth.tokenExpirySeconds,
                              }
                            : null,
                    };
                }),
            };
        }),

    importProject: publicProcedure
        .input(
            z.object({
                version: z.literal("1.0"),
                exportedAt: z.string(),
                project: z.object({
                    title: z.string().min(1),
                    description: z.string().nullable().optional(),
                    basePath: z.string().default("/"),
                    secret: z.string().optional(),
                }),
                folders: z.array(
                    z.object({
                        _ref: z.string(),
                        name: z.string().min(1),
                        parentRef: z.string().nullable(),
                    }),
                ),
                endpoints: z.array(
                    z.object({
                        _ref: z.string(),
                        name: z.string().min(1),
                        folderRef: z.string().nullable(),
                        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
                        path: z.string().min(1),
                        statusCode: z.number().int().min(100).max(599).default(200),
                        responseHeaders: z.record(z.string(), z.string()).optional(),
                        delayMs: z.number().int().min(0).default(0),
                        failureRate: z.number().min(0).max(1).default(0),
                        responseSchema: z.record(z.string(), z.unknown()).default({}),
                        responseCount: z.number().int().min(1).max(100).default(1),
                        authConfig: z
                            .object({
                                isLoginEndpoint: z.boolean().default(false),
                                requiresAuth: z.boolean().default(false),
                                tokenExpirySeconds: z.number().int().min(1).default(3600),
                            })
                            .nullable()
                            .optional(),
                    }),
                ),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { folders_table, endpoints_table, auth_configs_table } =
                await import("~/server/db/schema");
            const { generateAndSaveData } = await import("~/lib/endpoint-data-store");

            const [project] = await ctx.db
                .insert(projects_table)
                .values({
                    title: input.project.title,
                    description: input.project.description ?? undefined,
                    basePath: input.project.basePath,
                    secret: input.project.secret,
                })
                .returning();

            if (!project) throw new Error("Failed to create project during import.");

            const folderRefToId = new Map<string, string>();

            const folderMap = new Map(input.folders.map((f) => [f._ref, f]));
            const visited = new Set<string>();
            const sorted: typeof input.folders = [];

            function visitFolder(ref: string) {
                if (visited.has(ref)) return;
                visited.add(ref);
                const folder = folderMap.get(ref);
                if (!folder) return;
                if (folder.parentRef) visitFolder(folder.parentRef);
                sorted.push(folder);
            }

            for (const f of input.folders) visitFolder(f._ref);

            for (const folder of sorted) {
                const parentId = folder.parentRef
                    ? (folderRefToId.get(folder.parentRef) ?? null)
                    : null;

                // eslint-disable-next-line no-await-in-loop -- sequential: child folders need parent id from prior iteration
                const [created] = await ctx.db
                    .insert(folders_table)
                    .values({
                        name: folder.name,
                        projectId: project.id,
                        parentId: parentId ?? undefined,
                    })
                    .returning();

                if (created) folderRefToId.set(folder._ref, created.id);
            }

            const endpointRefToId = new Map<string, string>();

            for (const ep of input.endpoints) {
                const folderId = ep.folderRef ? (folderRefToId.get(ep.folderRef) ?? null) : null;

                // eslint-disable-next-line no-await-in-loop -- sequential: child folders need parent id from prior iteration
                const [created] = await ctx.db
                    .insert(endpoints_table)
                    .values({
                        name: ep.name,
                        projectId: project.id,
                        folderId: folderId ?? undefined,
                        method: ep.method,
                        path: ep.path,
                        statusCode: ep.statusCode,
                        responseHeaders: ep.responseHeaders ?? {},
                        delayMs: ep.delayMs,
                        failureRate: ep.failureRate,
                        responseSchema: ep.responseSchema,
                        responseCount: ep.responseCount,
                    })
                    .returning();

                if (!created) continue;

                endpointRefToId.set(ep._ref, created.id);

                generateAndSaveData(
                    project.id,
                    created.id,
                    created.responseSchema,
                    created.responseCount ?? 1,
                );

                if (ep.authConfig) {
                    // eslint-disable-next-line no-await-in-loop -- depends on created.id from this iteration
                    await ctx.db.insert(auth_configs_table).values({
                        endpointId: created.id,
                        isLoginEndpoint: ep.authConfig.isLoginEndpoint,
                        requiresAuth: ep.authConfig.requiresAuth,
                        tokenExpirySeconds: ep.authConfig.tokenExpirySeconds,
                    });
                }
            }

            return {
                projectId: project.id,
                foldersCreated: folderRefToId.size,
                endpointsCreated: endpointRefToId.size,
            };
        }),
});
