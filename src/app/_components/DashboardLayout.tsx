"use client";

import { Button } from "~/components/ui/button";
import { authClient } from "~/server/better-auth/client";

interface DashboardLayoutProps {
  user: { name?: string | null; email?: string | null };
  children: React.ReactNode;
}

export function DashboardLayout({ user, children }: DashboardLayoutProps) {
  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-50 border-b border-black/10 bg-white">
        <div className="flex items-center justify-between px-6 py-4 md:px-12 lg:px-20">
          <span className="text-lg font-semibold tracking-tight text-black">
            CheckkPlease
          </span>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-black/60 sm:inline">
              {user.email ?? user.name}
            </span>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="h-8 rounded-lg border-black/10 px-4 text-sm text-black hover:border-black/20 hover:bg-black/5"
            >
              Sign out
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="px-6 py-12 md:px-12 lg:px-20">{children}</main>
    </div>
  );
}
