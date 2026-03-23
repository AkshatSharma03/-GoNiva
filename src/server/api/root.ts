import { hotelRouter } from "~/server/api/routers/hotel";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * Primary tRPC router.
 */
export const appRouter = createTRPCRouter({
  hotel: hotelRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
