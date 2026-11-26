import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/booking/security";
import { Dashboard } from "@/components/admin/dashboard";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Resort reservations",
  robots: { index: false, follow: false },
};
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await currentStaff();
  if (!user) redirect("/admin/login/");
  return (
    <Dashboard
      user={user}
      initialTab={(await searchParams).tab || "overview"}
    />
  );
}
