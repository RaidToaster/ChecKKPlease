import type { HydratedDocument } from "mongoose";
import type { IDebt } from "@ChecKKPlease/db/models/debt.model";

export type DebtItemJSON = {
  _id: string;
  name: string;
  price: number;
  owner: string;
  paid: boolean;
};

export type DebtJSON = {
  _id: string;
  title: string;
  description?: string;
  paidBy: string;
  items: DebtItemJSON[];
  total: number;
  createdAt: string;
  updatedAt: string;
};

// 2. Wrap IDebt in HydratedDocument
export function serializeDebt(debt: HydratedDocument<IDebt>): DebtJSON {
  const json = debt.toJSON();
  return {
    ...json,
    _id: debt._id.toString(),
    createdAt: debt.createdAt.toISOString(),
    updatedAt: debt.updatedAt.toISOString(),
    items: json.items.map((item: any) => ({
      ...item,
      _id: item._id.toString(),
    })),
  } as DebtJSON;
}
