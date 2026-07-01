import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

import { env } from "~/env";
import { mongo } from "~/server/db";
import { ensureAdmin } from "~/server/db/seed";

export const auth = betterAuth({
  database: mongodbAdapter(mongo),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  socialProviders: {
    github: {
      clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
      redirectURI: "http://localhost:3000/api/auth/callback/github",
    },
  },
});

ensureAdmin();

export type Session = typeof auth.$Infer.Session;
