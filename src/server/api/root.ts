import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { healthRouter } from "./routers/health";
import { projectRouter } from "./routers/project";
import { folderRouter } from "./routers/folder";
import { endpointRouter } from "./routers/endpoint";
import { authConfigRouter } from "./routers/auth-config";

export const appRouter = createTRPCRouter({
    health: healthRouter,
    project: projectRouter,
    folder: folderRouter,
    endpoint: endpointRouter,
    authConfig: authConfigRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
