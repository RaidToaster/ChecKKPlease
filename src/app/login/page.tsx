"use client";

import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/server/better-auth/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/",
      });

      if (res.error) {
        setError(res.error.message ?? "Invalid credentials");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm border-black/10 border-solid border-2 p-8 rounded-2xl">
        <h1 className="mb-12 text-3xl font-semibold tracking-tight text-black">
          CheckkPlease
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
              className="h-11 rounded-lg border-black/10 px-4 text-base focus-visible:border-black focus-visible:ring-black/20"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="h-11 rounded-lg border-black/10 px-4 text-base focus-visible:border-black focus-visible:ring-black/20"
            />
          </div>

          {error && <p className="text-sm text-black/60">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-lg bg-black text-sm font-medium text-white hover:bg-black/80"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </main>
  );
}
