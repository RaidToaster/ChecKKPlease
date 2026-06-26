import { model, Schema, Types, models, Model } from "mongoose";

const debtItemSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  owner: { type: String, required: true },
  paid: { type: Boolean, required: true, default: false },
});

const debtSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    paidBy: { type: String, required: true },
    items: [debtItemSchema],
    total: { type: Number, required: true },
  },
  { collection: "debts", timestamps: true },
);

export type IDebtItem = {
  _id: Types.ObjectId;
  name: string;
  price: number;
  owner: string;
  paid: boolean;
};

export type IDebt = {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  paidBy: string;
  items: IDebtItem[];
  total: number;
  createdAt: Date;
  updatedAt: Date;
};

const Debt = (models.Debt as Model<IDebt>) || model<IDebt>("Debt", debtSchema);
export default Debt;
