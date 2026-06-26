import { protectedProcedure, publicProcedure, router } from "../index";
import { debtRouter } from "./debt";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  debt: debtRouter,
});
export type AppRouter = typeof appRouter;
