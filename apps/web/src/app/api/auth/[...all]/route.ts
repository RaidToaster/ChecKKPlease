import { createAuth } from "@ChecKKPlease/auth";
import { toNextJsHandler } from "better-auth/next-js";

export async function GET(request: Request) {
  return toNextJsHandler(createAuth()).GET(request);
}

export async function POST(request: Request) {
  return toNextJsHandler(createAuth()).POST(request);
}
