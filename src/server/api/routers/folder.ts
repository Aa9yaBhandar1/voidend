import { z } from "zod";
import { eq } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { folders_table } from "~/server/db/schema";

export const folderRouter = createTRPCRouter({
    create: publicProcedure
        .input(
            z.object({
                name: z.string().min(1),
                projectId: z.string().uuid(),
                parentId: z.string().uuid().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const [folder] = await ctx.db.insert(folders_table).values(input).returning();
            return folder;
        }),
    update: publicProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                name: z.string().min(1).optional(),
                parentId: z.string().uuid().nullable().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            const [updated] = await ctx.db
                .update(folders_table)
                .set(data)
                .where(eq(folders_table.id, id))
                .returning();
            return updated;
        }),
    delete: publicProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.delete(folders_table).where(eq(folders_table.id, input.id));
        }),
    getByProject: publicProcedure
        .input(z.object({ projectId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.query.folders_table.findMany({
                where: (f, { eq }) => eq(f.projectId, input.projectId),
                orderBy: (f, { asc }) => [asc(f.name)],
            });
        }),
});
