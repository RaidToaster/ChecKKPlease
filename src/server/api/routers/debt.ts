import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { DebtDoc } from "~/server/repositories/debt";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { ItemSchema, PeopleEnum } from "~/server/db/schema";

const CreateDebtInput = z.object({
  title: z.string().min(1),
  paidBy: PeopleEnum,
  items: z.array(ItemSchema.omit({ _id: true })).min(1),
});

const GetAllDebtsInput = z.object({
  search: z.string().optional(),
  status: z.enum(["all", "pending", "settled"]).default("all"),
  owner: z.string().optional(),
  paidBy: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const UpdateDebtInput = z.object({
  _id: z.string().min(1),
  title: z.string().min(1),
  paidBy: PeopleEnum,
  items: z.array(ItemSchema.extend({ _id: z.string().optional() })).min(1),
});

function mapDebt(doc: DebtDoc) {
  return { ...doc, _id: doc._id.toHexString() };
}

export const debtRouter = createTRPCRouter({
  createDebt: protectedProcedure
    .input(CreateDebtInput)
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.debtRepository.create(input);
      return mapDebt(doc);
    }),

  getAllDebts: protectedProcedure
    .input(GetAllDebtsInput.optional())
    .query(async ({ ctx, input }) => {
      const debts = await ctx.debtRepository.findAll(input ?? {});
      return debts.map(mapDebt);
    }),

  getAllOwners: protectedProcedure.query(async ({ ctx }) => {
    return ctx.debtRepository.getAllOwners();
  }),

  getAllPaidBy: protectedProcedure.query(async ({ ctx }) => {
    return ctx.debtRepository.getAllPaidBy();
  }),

  getDebtById: protectedProcedure
    .input(z.object({ _id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const debt = await ctx.debtRepository.findById(input._id);
      if (!debt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Debt not found" });
      }
      return mapDebt(debt);
    }),

  updateDebt: protectedProcedure
    .input(UpdateDebtInput)
    .mutation(async ({ ctx, input }) => {
      const { _id, ...data } = input;
      const found = await ctx.debtRepository.update(_id, data);
      if (!found) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Debt not found" });
      }
    }),

  deleteDebt: protectedProcedure
    .input(z.object({ _id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const found = await ctx.debtRepository.delete(input._id);
      if (!found) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Debt not found" });
      }
    }),

  markItemAsPaid: protectedProcedure
    .input(
      z.object({
        debtId: z.string().min(1),
        itemId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const found = await ctx.debtRepository.markItemPaid(
        input.debtId,
        input.itemId,
      );
      if (!found) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Debt not found" });
      }
    }),

  getSettlementPreview: protectedProcedure
    .input(
      z.object({
        personA: PeopleEnum,
        personB: PeopleEnum,
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.debtRepository.getSettlementPreview(
        input.personA,
        input.personB,
      );
    }),

  getDebtSummary: protectedProcedure
    .input(z.object({ person: PeopleEnum }))
    .query(async ({ ctx, input }) => {
      return ctx.debtRepository.getDebtSummary(input.person);
    }),

  settleBetween: protectedProcedure
    .input(
      z.object({
        personA: PeopleEnum,
        personB: PeopleEnum,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.debtRepository.settleBetween(
        input.personA,
        input.personB,
      );
      return { updatedCount: count };
    }),

  markItemAsUnpaid: protectedProcedure
    .input(
      z.object({
        debtId: z.string().min(1),
        itemId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const found = await ctx.debtRepository.markItemUnpaid(
        input.debtId,
        input.itemId,
      );
      if (!found) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Debt not found" });
      }
    }),
});
