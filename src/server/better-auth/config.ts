import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

import { mongo } from "~/server/db";
import { ensureAdmin } from "~/server/db/seed";

export const auth = betterAuth({
  database: mongodbAdapter(mongo),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  socialProviders: {},
});

void ensureAdmin();

export type Session = typeof auth.$Infer.Session;
