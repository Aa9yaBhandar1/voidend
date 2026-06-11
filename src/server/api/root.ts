import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { healthRouter } from "./routers/health";

export const appRouter = createTRPCRouter({
    health: healthRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
