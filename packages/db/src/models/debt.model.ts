import { model, Schema } from "mongoose";

const debtSchema = new Schema(
  {
    title: { type: String },
    description: { type: String, required: true },
    paidBy: { type: String, required: true },
    items: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        owner: { type: String, required: true },
        paid: { type: Boolean, required: true },
      },
    ],
    total: { type: Number, required: true },
  },
  {
    collection: "debts",
    timestamps: true,
  },
);

const Debt = model("Debt", debtSchema);

export default Debt;
