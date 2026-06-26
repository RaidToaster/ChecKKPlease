import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Debt, {
  type IDebt,
  type IDebtItem,
} from "@ChecKKPlease/db/models/debt.model";
import { protectedProcedure, router } from "..";
import { serializeDebt } from "../serializers/debt";

const createDebtSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  paidBy: z.string().min(1),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        price: z.number().positive(),
        owner: z.string().min(1),
      }),
    )
    .min(1),
});

const updateDebtSchema = z.object({
  debtId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  paidBy: z.string().min(1),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        price: z.number().positive(),
        owner: z.string().min(1),
      }),
    )
    .min(1),
});

const idParam = z.object({ debtId: z.string() });
const markItemPaidSchema = z.object({
  debtId: z.string(),
  itemId: z.string(),
});

export const debtRouter = router({
  createDebt: protectedProcedure
    .input(createDebtSchema)
    .mutation(async ({ input }) => {
      const total = input.items.reduce((acc, item) => acc + item.price, 0);
      const debt = await Debt.create({
        ...input,
        items: input.items.map((item) => ({ ...item, paid: false })),
        total,
      });
      return serializeDebt(debt);
    }),

  updateDebt: protectedProcedure
    .input(updateDebtSchema)
    .mutation(async ({ input }) => {
      const total = input.items.reduce((acc, item) => acc + item.price, 0);
      const debt = await Debt.findByIdAndUpdate(
        input.debtId,
        {
          title: input.title,
          description: input.description,
          paidBy: input.paidBy,
          items: input.items.map((item) => ({ ...item, paid: false })),
          total,
        },
        { new: true },
      );
      if (!debt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Debt not found" });
      }
      return serializeDebt(debt);
    }),

  getAllDebts: protectedProcedure.query(async () => {
    const debts = await Debt.find().sort({ createdAt: -1 });
    return debts.map(serializeDebt);
  }),

  getDebt: protectedProcedure.input(idParam).query(async ({ input }) => {
    const debt = await Debt.findById(input.debtId);
    if (!debt) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Debt not found" });
    }
    return serializeDebt(debt);
  }),

  markItemUnpaid: protectedProcedure
    .input(markItemPaidSchema)
    .mutation(async ({ input }) => {
      const debt = await Debt.findById(input.debtId);
      if (!debt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Debt not found" });
      }
      const item = (debt.items as IDebtItem[]).find(
        (i) => i._id.toString() === input.itemId,
      );
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }
      if (!item.paid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Item already unpaid",
        });
      }
      item.paid = false;
      await debt.save();
      return serializeDebt(debt);
    }),

  markItemPaid: protectedProcedure
    .input(markItemPaidSchema)
    .mutation(async ({ input }) => {
      const debt = await Debt.findById(input.debtId);
      if (!debt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Debt not found" });
      }
      const item = (debt.items as IDebtItem[]).find(
        (i) => i._id.toString() === input.itemId,
      );
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }
      if (item.paid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Item already paid",
        });
      }
      item.paid = true;
      await debt.save();
      return serializeDebt(debt);
    }),

  deleteDebt: protectedProcedure.input(idParam).mutation(async ({ input }) => {
    const debt = await Debt.findByIdAndDelete(input.debtId);
    if (!debt) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Debt not found" });
    }
    return { success: true };
  }),
});
