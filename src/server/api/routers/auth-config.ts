import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import z from "zod";
import { auth_configs_table } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const authConfigRouter = createTRPCRouter({
    upsert: publicProcedure
        .input(
            z.object({
                endpointId: z.string().uuid(),
                isLoginEndpoint: z.boolean().default(false),
                requiresAuth: z.boolean().default(false),
                tokenExpirySeconds: z.number().int().min(1).default(3600),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            if (input.isLoginEndpoint && input.requiresAuth) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "An endpoint cannot be both a login endpoint and require auth.",
                });
            }

            const endpoint = await ctx.db.query.endpoints_table.findFirst({
                where: (e, { eq }) => eq(e.id, input.endpointId),
            });
            if (!endpoint) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Endpoint not found." });
            }

            const existing = await ctx.db.query.auth_configs_table.findFirst({
                where: (a, { eq }) => eq(a.endpointId, input.endpointId),
            });

            if (existing) {
                const [updated] = await ctx.db
                    .update(auth_configs_table)
                    .set({
                        isLoginEndpoint: input.isLoginEndpoint,
                        requiresAuth: input.requiresAuth,
                        tokenExpirySeconds: input.tokenExpirySeconds,
                    })
                    .where(eq(auth_configs_table.endpointId, input.endpointId))
                    .returning();
                return updated;
            }

            const [created] = await ctx.db.insert(auth_configs_table).values(input).returning();
            return created;
        }),

    getByEndpoint: publicProcedure
        .input(z.object({ endpointId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
            const config = await ctx.db.query.auth_configs_table.findFirst({
                where: (a, { eq }) => eq(a.endpointId, input.endpointId),
            });
            return config ?? null;
        }),

    delete: publicProcedure
        .input(z.object({ endpointId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db
                .delete(auth_configs_table)
                .where(eq(auth_configs_table.endpointId, input.endpointId));
        }),
});
