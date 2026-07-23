import { z } from "zod";

export const PEOPLE = [
  "KK",
  "LO",
  "PP",
  "KA",
  "YK",
  "MS",
  "GT",
  "VJ",
  "XY",
] as const;

export const PeopleEnum = z.enum(PEOPLE);

export const ItemSchema = z.object({
  _id: z.string(),
  name: z.string(),
  price: z.number().int(),
  owner: PeopleEnum,
  paid: z.boolean(),
});

export const DebtSchema = z.object({
  title: z.string(),
  paidBy: z.string(),
  items: z.array(ItemSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.number().int().default(0),
});
