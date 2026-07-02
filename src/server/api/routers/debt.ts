import { ObjectId, type WithId } from "mongodb";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { ItemSchema } from "~/server/db/schema";

interface DebtDoc {
  title: string;
  paidBy: string;
  items: Array<{
    _id: string;
    name: string;
    price: number;
    owner: string;
    paid: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

const CreateDebtInput = z.object({
  title: z.string().min(1),
  paidBy: z.string().min(1),
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

  getAllDebts: protectedProcedure
    .input(GetAllDebtsInput.optional())
    .query(async ({ ctx, input }) => {
      const conditions: Record<string, unknown>[] = [];

      const search = input?.search?.trim();
      if (search) {
        const s = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        conditions.push({
          $or: [
            { title: { $regex: s, $options: "i" } },
            { paidBy: { $regex: s, $options: "i" } },
            { "items.name": { $regex: s, $options: "i" } },
            { "items.owner": { $regex: s, $options: "i" } },
          ],
        });
      }

      if (input?.status === "pending") {
        conditions.push({ items: { $elemMatch: { paid: false } } });
      } else if (input?.status === "settled") {
        conditions.push({
          $and: [
            { "items.0": { $exists: true } },
            { items: { $not: { $elemMatch: { paid: false } } } },
          ],
        });
      }

      const owner = input?.owner?.trim();
      if (owner) {
        conditions.push({ "items.owner": owner });
      }

      const paidBy = input?.paidBy?.trim();
      if (paidBy) {
        conditions.push({ paidBy });
      }

      if (input?.dateFrom || input?.dateTo) {
        const dateFilter: Record<string, Date> = {};
        if (input?.dateFrom) {
          dateFilter.$gte = new Date(input.dateFrom);
        }
        if (input?.dateTo) {
          const end = new Date(input.dateTo);
          end.setHours(23, 59, 59, 999);
          dateFilter.$lte = end;
        }
        conditions.push({ createdAt: dateFilter });
      }

      const filter = conditions.length > 0 ? { $and: conditions } : {};

      const debts = (await ctx.mongo
        .collection("debts")
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray()) as WithId<DebtDoc>[];
      return debts.map((d) => ({
        ...d,
        _id: d._id.toHexString(),
      }));
    }),

  getAllOwners: protectedProcedure.query(async ({ ctx }) => {
    return (await ctx.mongo
      .collection("debts")
      .distinct("items.owner")) as string[];
  }),

  getAllPaidBy: protectedProcedure.query(async ({ ctx }) => {
    return (await ctx.mongo
      .collection("debts")
      .distinct("paidBy")) as string[];
  }),

  getDebtById: protectedProcedure
    .input(z.object({ _id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const debt = (await ctx.mongo.collection("debts").findOne({
        _id: new ObjectId(input._id),
      })) as WithId<DebtDoc> | null;
      if (!debt) {
        throw new Error("Debt not found");
      }
      return {
        ...debt,
        _id: debt._id.toHexString(),
      };
    }),

  updateDebt: protectedProcedure
    .input(UpdateDebtInput)
    .mutation(async ({ ctx, input }) => {
      const { _id, ...updateData } = input;
      const res = await ctx.mongo.collection("debts").updateOne(
        { _id: new ObjectId(input._id) },
        { $set: { ...updateData, updatedAt: new Date() } },
      );
      return res;
    }),

  deleteDebt: protectedProcedure
    .input(z.object({ _id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const res = await ctx.mongo.collection("debts").deleteOne({
        _id: new ObjectId(input._id),
      });
      return res;
    }),

  markItemAsPaid: protectedProcedure
    .input(
      z.object({
        debtId: z.string().min(1),
        itemId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const res = await ctx.mongo.collection("debts").updateOne(
        { _id: new ObjectId(input.debtId), "items._id": input.itemId },
        { $set: { "items.$.paid": true, updatedAt: new Date() } },
      );
      return res;
    }),

  markItemAsUnpaid: protectedProcedure
    .input(
      z.object({
        debtId: z.string().min(1),
        itemId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const res = await ctx.mongo.collection("debts").updateOne(
        { _id: new ObjectId(input.debtId), "items._id": input.itemId },
        { $set: { "items.$.paid": false, updatedAt: new Date() } },
      );
      return res;
    }),
});
