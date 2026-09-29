import { type Db, type MongoClient, ObjectId } from "mongodb";
import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { getNetBalances } from "../../lib/settlement";

export interface DebtDoc {
  _id: ObjectId;
  title: string;
  paidBy: string;
  items: DebtItem[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface DebtItem {
  _id: string;
  name: string;
  price: number;
  owner: string;
  paid: boolean;
}

export interface CreateDebtData {
  title: string;
  paidBy: string;
  items: Array<{ name: string; price: number; owner: string }>;
}

export interface UpdateDebtData {
  title: string;
  paidBy: string;
  items: Array<{
    _id?: string;
    name: string;
    price: number;
    owner: string;
    paid: boolean;
  }>;
}

export interface DebtFilters {
  search?: string;
  status?: "all" | "pending" | "settled";
  owner?: string;
  paidBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DebtRepository {
  findAll(filters: DebtFilters): Promise<DebtDoc[]>;
  findById(id: string): Promise<DebtDoc | null>;
  create(data: CreateDebtData): Promise<DebtDoc>;
  update(id: string, data: UpdateDebtData): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  markItemPaid(debtId: string, itemId: string): Promise<boolean>;
  markItemUnpaid(debtId: string, itemId: string): Promise<boolean>;
  settleBetween(
    personA: string,
    personB: string,
    revision: string,
  ): Promise<number>;
  getSettlementPreview(
    personA: string,
    personB: string,
  ): Promise<SettlementPreview>;
  getAllOwners(): Promise<string[]>;
  getAllPaidBy(): Promise<string[]>;
}

export interface SettlementPreview {
  items: SettlementItem[];
  total: number;
  aOwesB: number;
  bOwesA: number;
  from: string;
  to: string;
  revision: string;
}

function previewFor(
  debts: DebtDoc[],
  personA: string,
  personB: string,
): SettlementPreview {
  const items = debts.flatMap((debt) =>
    debt.items
      .filter(
        (item) =>
          !item.paid &&
          item.owner !== debt.paidBy &&
          ((item.owner === personA && debt.paidBy === personB) ||
            (item.owner === personB && debt.paidBy === personA)),
      )
      .map((item) => ({
        ...item,
        debtId: debt._id.toHexString(),
        debtTitle: debt.title,
        from: item.owner,
        to: debt.paidBy,
      })),
  );
  const balance = getNetBalances(debts).find(
    (pair) =>
      [pair.personA, pair.personB].includes(personA) &&
      [pair.personA, pair.personB].includes(personB),
  );
  return {
    items,
    total: balance?.amount ?? 0,
    aOwesB: items
      .filter((item) => item.from === personA)
      .reduce((sum, item) => sum + item.price, 0),
    bOwesA: items
      .filter((item) => item.from === personB)
      .reduce((sum, item) => sum + item.price, 0),
    from: balance?.from ?? personA,
    to: balance?.to ?? personB,
    revision: createHash("sha256")
      .update(JSON.stringify(items.sort((a, b) => a._id.localeCompare(b._id))))
      .digest("hex"),
  };
}

export interface SettlementItem {
  from: string;
  to: string;
  name: string;
  price: number;
  debtTitle: string;
}

const COLLECTION = "debts";

export class MongoDebtRepository implements DebtRepository {
  constructor(
    private db: Db,
    private client: MongoClient,
  ) {}

  async findAll(filters: DebtFilters): Promise<DebtDoc[]> {
    const conditions: Record<string, unknown>[] = [];

    const search = filters.search?.trim();
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

    if (filters.status === "pending" || filters.status === "settled") {
      const pendingCount = {
        $size: {
          $filter: {
            input: "$items",
            as: "item",
            cond: {
              $and: [
                { $eq: ["$$item.paid", false] },
                { $ne: ["$$item.owner", "$paidBy"] },
              ],
            },
          },
        },
      };
      conditions.push({
        $expr:
          filters.status === "pending"
            ? { $gt: [pendingCount, 0] }
            : { $eq: [pendingCount, 0] },
      });
    }

    const owner = filters.owner?.trim();
    if (owner) {
      conditions.push({ "items.owner": owner });
    }

    const paidBy = filters.paidBy?.trim();
    if (paidBy) {
      conditions.push({ paidBy });
    }

    if (filters.dateFrom || filters.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (filters.dateFrom) {
        dateFilter.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      conditions.push({ createdAt: dateFilter });
    }

    const filter = conditions.length > 0 ? { $and: conditions } : {};

    return this.db
      .collection<DebtDoc>(COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
  }

  async findById(id: string): Promise<DebtDoc | null> {
    return this.db
      .collection<DebtDoc>(COLLECTION)
      .findOne({ _id: new ObjectId(id) });
  }

  async create(data: CreateDebtData): Promise<DebtDoc> {
    const doc: DebtDoc = {
      _id: new ObjectId(),
      title: data.title,
      paidBy: data.paidBy,
      items: data.items.map((item) => ({
        ...item,
        _id: new ObjectId().toHexString(),
        paid: false,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    await this.db.collection<DebtDoc>(COLLECTION).insertOne(doc);
    return doc;
  }

  async update(id: string, data: UpdateDebtData): Promise<boolean> {
    const result = await this.db.collection<DebtDoc>(COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          title: data.title,
          paidBy: data.paidBy,
          items: data.items.map((item) => ({
            ...item,
            _id: item._id ?? new ObjectId().toHexString(),
          })),
          updatedAt: new Date(),
        },
      },
    );
    return result.matchedCount > 0;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.collection<DebtDoc>(COLLECTION).deleteOne({
      _id: new ObjectId(id),
    });
    return result.deletedCount > 0;
  }

  async markItemPaid(debtId: string, itemId: string): Promise<boolean> {
    const result = await this.db
      .collection<DebtDoc>(COLLECTION)
      .updateOne(
        { _id: new ObjectId(debtId), "items._id": itemId },
        { $set: { "items.$.paid": true, updatedAt: new Date() } },
      );
    return result.matchedCount > 0;
  }

  async markItemUnpaid(debtId: string, itemId: string): Promise<boolean> {
    const result = await this.db
      .collection<DebtDoc>(COLLECTION)
      .updateOne(
        { _id: new ObjectId(debtId), "items._id": itemId },
        { $set: { "items.$.paid": false, updatedAt: new Date() } },
      );
    return result.matchedCount > 0;
  }

  async settleBetween(
    personA: string,
    personB: string,
    revision: string,
  ): Promise<number> {
    const session = this.client.startSession();
    try {
      return await session.withTransaction(async () => {
        const collection = this.db.collection<DebtDoc>(COLLECTION);
        const debts = await collection
          .find({ paidBy: { $in: [personA, personB] } }, { session })
          .toArray();
        const preview = previewFor(debts, personA, personB);
        if (preview.revision !== revision || preview.items.length === 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Saldo berubah. Periksa nominal terbaru sebelum konfirmasi.",
          });
        }
        let count = 0;
        for (const debt of debts) {
          const owner = debt.paidBy === personA ? personB : personA;
          if (!debt.items.some((item) => item.owner === owner && !item.paid))
            continue;
          const result = await collection.updateOne(
            { _id: debt._id },
            { $set: { "items.$[item].paid": true, updatedAt: new Date() } },
            {
              session,
              arrayFilters: [{ "item.owner": owner, "item.paid": false }],
            },
          );
          count += result.modifiedCount;
        }
        return count;
      });
    } finally {
      await session.endSession();
    }
  }

  async getSettlementPreview(
    personA: string,
    personB: string,
  ): Promise<SettlementPreview> {
    const debts = await this.db
      .collection<DebtDoc>(COLLECTION)
      .find({ paidBy: { $in: [personA, personB] } })
      .toArray();
    return previewFor(debts, personA, personB);
  }

  async getAllOwners(): Promise<string[]> {
    return this.db.collection(COLLECTION).distinct("items.owner") as Promise<
      string[]
    >;
  }

  async getAllPaidBy(): Promise<string[]> {
    return this.db.collection(COLLECTION).distinct("paidBy") as Promise<
      string[]
    >;
  }
}
