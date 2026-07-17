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
  update(id: string, data: UpdateDebtData): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  markItemPaid(debtId: string, itemId: string): Promise<boolean>;
  markItemUnpaid(debtId: string, itemId: string): Promise<boolean>;
  settleBetween(personA: string, personB: string): Promise<number>;
  getSettlementPreview(
    personA: string,
    personB: string,
  ): Promise<{ items: SettlementItem[]; total: number }>;
  getDebtSummary(creditor: string): Promise<DebtSummary>;
  getAllOwners(): Promise<string[]>;
  getAllPaidBy(): Promise<string[]>;
}

export interface SettlementItem {
  name: string;
  price: number;
  debtTitle: string;
}

export interface DebtSummaryItem {
  name: string;
  price: number;
  debtTitle: string;
  date: Date;
}

export interface DebtSummaryByPerson {
  person: string;
  items: DebtSummaryItem[];
  total: number;
}

export interface DebtSummary {
  creditor: string;
  debtors: DebtSummaryByPerson[];
  grandTotal: number;
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
    const result = await this.db.collection<DebtDoc>(COLLECTION).updateOne(
      { _id: new ObjectId(debtId), "items._id": itemId },
      { $set: { "items.$.paid": true, updatedAt: new Date() } },
    );
    return result.matchedCount > 0;
  }

  async markItemUnpaid(debtId: string, itemId: string): Promise<boolean> {
    const result = await this.db.collection<DebtDoc>(COLLECTION).updateOne(
      { _id: new ObjectId(debtId), "items._id": itemId },
      { $set: { "items.$.paid": false, updatedAt: new Date() } },
    );
    return result.matchedCount > 0;
  }

  async settleBetween(personA: string, personB: string): Promise<number> {
    const result = await this.db.collection<DebtDoc>(COLLECTION).updateMany(
      { paidBy: personB, "items.owner": personA, "items.paid": false },
      { $set: { "items.$[elem].paid": true, updatedAt: new Date() } },
      { arrayFilters: [{ "elem.owner": personA, "elem.paid": false }] },
    );

    return result.modifiedCount;
  }

  async getSettlementPreview(
    personA: string,
    personB: string,
  ): Promise<{ items: SettlementItem[]; total: number }> {
    const debts = await this.db
      .collection<DebtDoc>(COLLECTION)
      .find(
        { paidBy: personB, "items.owner": personA, "items.paid": false },
        { projection: { title: 1, items: 1 } },
      )
      .toArray();

    const items = debts.flatMap((debt) =>
      debt.items
        .filter((item) => item.owner === personA && !item.paid)
        .map((item) => ({
          name: item.name,
          price: item.price,
          debtTitle: debt.title,
        })),
    );

    return {
      items,
      total: items.reduce((s, i) => s + i.price, 0),
    };
  }

  async getDebtSummary(creditor: string): Promise<DebtSummary> {
    const debts = await this.db
      .collection<DebtDoc>(COLLECTION)
      .find(
        { paidBy: creditor, "items.paid": false },
        { projection: { title: 1, items: 1, createdAt: 1 } },
      )
      .sort({ createdAt: 1 })
      .toArray();

    const byPerson = new Map<string, DebtSummaryItem[]>();

    for (const debt of debts) {
      for (const item of debt.items) {
        if (item.paid || item.owner === creditor) continue;
        const list = byPerson.get(item.owner) ?? [];
        list.push({
          name: item.name,
          price: item.price,
          debtTitle: debt.title,
          date: debt.createdAt,
        });
        byPerson.set(item.owner, list);
      }
    }

    const debtors: DebtSummaryByPerson[] = [...byPerson.entries()]
      .map(([person, items]) => ({
        person,
        items,
        total: items.reduce((s, i) => s + i.price, 0),
      }))
      .sort((a, b) => a.person.localeCompare(b.person));

    return {
      creditor,
      debtors,
      grandTotal: debtors.reduce((s, d) => s + d.total, 0),
    };
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
