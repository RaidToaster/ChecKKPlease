import { type Db, ObjectId } from "mongodb";

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
  update(id: string, data: UpdateDebtData): Promise<void>;
  delete(id: string): Promise<void>;
  markItemPaid(debtId: string, itemId: string): Promise<void>;
  markItemUnpaid(debtId: string, itemId: string): Promise<void>;
  getAllOwners(): Promise<string[]>;
  getAllPaidBy(): Promise<string[]>;
}

const COLLECTION = "debts";

export class MongoDebtRepository implements DebtRepository {
  constructor(private db: Db) {}

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

    if (filters.status === "pending") {
      conditions.push({ items: { $elemMatch: { paid: false } } });
    } else if (filters.status === "settled") {
      conditions.push({
        $and: [
          { "items.0": { $exists: true } },
          { items: { $not: { $elemMatch: { paid: false } } } },
        ],
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

  async update(id: string, data: UpdateDebtData): Promise<void> {
    await this.db.collection<DebtDoc>(COLLECTION).updateOne(
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
  }

  async delete(id: string): Promise<void> {
    await this.db.collection<DebtDoc>(COLLECTION).deleteOne({
      _id: new ObjectId(id),
    });
  }

  async markItemPaid(debtId: string, itemId: string): Promise<void> {
    await this.db.collection<DebtDoc>(COLLECTION).updateOne(
      { _id: new ObjectId(debtId), "items._id": itemId },
      { $set: { "items.$.paid": true, updatedAt: new Date() } },
    );
  }

  async markItemUnpaid(debtId: string, itemId: string): Promise<void> {
    await this.db.collection<DebtDoc>(COLLECTION).updateOne(
      { _id: new ObjectId(debtId), "items._id": itemId },
      { $set: { "items.$.paid": false, updatedAt: new Date() } },
    );
  }

  async getAllOwners(): Promise<string[]> {
    return this.db
      .collection(COLLECTION)
      .distinct("items.owner") as Promise<string[]>;
  }

  async getAllPaidBy(): Promise<string[]> {
    return this.db
      .collection(COLLECTION)
      .distinct("paidBy") as Promise<string[]>;
  }
}
