import { hashPassword } from "@better-auth/utils/password";
import { ObjectId } from "mongodb";

import { env } from "~/env";
import { mongo } from "~/server/db";

export async function ensureAdmin() {
  const existing = await mongo
    .collection("user")
    .findOne({ email: env.ADMIN_EMAIL.toLowerCase() });

  if (existing) return;

  const hashed = await hashPassword(env.ADMIN_PASSWORD);
  const userId = new ObjectId();

  await mongo.collection("user").insertOne({
    _id: userId,
    name: "Admin",
    email: env.ADMIN_EMAIL.toLowerCase(),
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await mongo.collection("account").insertOne({
    _id: new ObjectId(),
    userId,
    accountId: userId.toHexString(),
    providerId: "credential",
    password: hashed,
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
