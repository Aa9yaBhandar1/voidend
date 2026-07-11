import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { sql } from "drizzle-orm";

export const healthRouter = createTRPCRouter({
    check: publicProcedure.query(async ({ ctx }) => {
        let dbStatus = "ok";
        try {
            ctx.db.get(sql`SELECT 1`);
        } catch {
            dbStatus = "unreachable";
        }
        return {
            status: "ok",
            db: dbStatus,
            timestamp: new Date().toISOString(),
        };
    }),
});
