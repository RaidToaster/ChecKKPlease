import { MongoClient } from "mongodb";

import { env } from "~/env";

const globalForMongo = globalThis as unknown as {
  client: MongoClient | undefined;
};

const client = globalForMongo.client ?? new MongoClient(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForMongo.client = client;

export const mongo = client.db();
export { client as mongoClient };
