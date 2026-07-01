import { ObjectId } from "mongodb";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { ItemSchema } from "~/server/db/schema";

const CreateDebtInput = z.object({
  title: z.string().min(1),
  paidBy: z.string().min(1),
  items: z.array(ItemSchema.omit({ _id: true })).min(1),
});

const UpdateDebtInput = z.object({
  _id: z.string().min(1),
  title: z.string().min(1),
  paidBy: z.string().min(1),
  items: z.array(ItemSchema).min(1),
});

export const debtRouter = createTRPCRouter({
  createDebt: protectedProcedure
    .input(CreateDebtInput)
    .mutation(async ({ ctx, input }) => {
      const doc = {
        title: input.title,
        paidBy: input.paidBy,
        items: input.items.map((item) => ({
          ...item,
          _id: new ObjectId().toHexString(),
          paid: false,
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 0,
      };

      const res = await ctx.mongo.collection("debts").insertOne(doc);

      return {
        _id: res.insertedId.toHexString(),
        ...doc,
      };
    }),

  getAllDebts: protectedProcedure.query(async ({ ctx}) => {
    const debts = await ctx.mongo
      .collection("debts")
      .find({  })
      .toArray();
    return debts;
  }),

  updateDebt: protectedProcedure.input(UpdateDebtInput)
    .mutation(async ({ ctx, input }) => {
      const res = await ctx.mongo.collection("debts").updateOne(
        { _id: new ObjectId(input._id) },
        { $set: { ...input, updatedAt: new Date() } },
      );
      return res;
    }),

  deleteDebt: protectedProcedure.input(z.object({ _id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const res = await ctx.mongo.collection("debts").deleteOne(
        { _id: new ObjectId(input._id) },
      );
      return res;
    }),

  markItemAsPaid: protectedProcedure
    .input(z.object({ debtId: z.string().min(1), itemId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const res = await ctx.mongo.collection("debts").updateOne(
        { _id: new ObjectId(input.debtId), "items._id": input.itemId },
        { $set: { "items.$.paid": true, updatedAt: new Date() } },
      );
      return res;
    }),
});
