import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { healthRouter } from "./routers/health";
import { projectRouter } from "./routers/project";
import { folderRouter } from "./routers/folder";
import { endpointRouter } from "./routers/endpoint";

export const appRouter = createTRPCRouter({
    health: healthRouter,
    project: projectRouter,
    folder: folderRouter,
    endpoint: endpointRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
