import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { healthRouter } from "./routers/health";
import { projectRouter } from "./routers/project";
import { folderRouter } from "./routers/folder";

export const appRouter = createTRPCRouter({
    health: healthRouter,
    project: projectRouter,
    folder: folderRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
