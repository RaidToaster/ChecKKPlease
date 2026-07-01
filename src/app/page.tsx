import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { DashboardLayout } from "./_components/DashboardLayout";
import { DebtGrid } from "./_components/DebtGrid";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardLayout user={session.user}>
      <DebtGrid />
    </DashboardLayout>
  );
}
