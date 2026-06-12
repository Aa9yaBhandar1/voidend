import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { healthRouter } from "./routers/health";
import { projectRouter } from "./routers/project";

export const appRouter = createTRPCRouter({
    health: healthRouter,
    project: projectRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
