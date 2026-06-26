import z from "zod";
import Debt from "@ChecKKPlease/db/models/debt.model";
import { protectedProcedure, router } from "..";

const createDebtSchema = z.object({
  title: z.string(),
  description: z.string(),
  paidBy: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      price: z.number(),
      owner: z.string(),
      paid: z.boolean(),
    }),
  ),
  total: z.number(),
});

const markItemPaidSchema = z.object({
  debtId: z.string(),
  itemId: z.string(),
});

const getDebtSchema = z.object({
  debtId: z.string(),
});

export const debtRouter = router({
  createDebt: protectedProcedure
    .input(createDebtSchema)
    .mutation(async ({ input }) => {
      const total = input.items.reduce((acc, item) => acc + item.price, 0);
      const debt = await Debt.create({ ...input, total });
      return debt;
    }),

  getAllDebts: protectedProcedure.query(async () => {
    const debt = await Debt.find();
    return debt;
  }),

  getDebt: protectedProcedure.input(getDebtSchema).query(async ({ input }) => {
    const debt = await Debt.findById(input.debtId);
    if (!debt) {
      throw new Error("Debt not found");
    }
    return debt;
  }),

  markItemPaid: protectedProcedure
    .input(markItemPaidSchema)
    .mutation(async ({ input }) => {
      const debt = await Debt.findById(input.debtId);
      if (!debt) {
        throw new Error("Debt not found");
      }
      const item = debt.items.id(input.itemId);
      if (!item) {
        throw new Error("Item not found");
      }
      item.paid = true;
      await debt.save();
      return debt;
    }),

  deleteDebt: protectedProcedure
    .input(getDebtSchema)
    .mutation(async ({ input }) => {
      const debt = await Debt.findByIdAndDelete(input.debtId);
      if (!debt) {
        throw new Error("Debt not found");
      }
      return debt;
    }),
});
