import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <Link
        href="/dashboard"
        className="text-emerald-400 transition-colors hover:text-emerald-300 hover:underline"
      >
        ← Dashboard
      </Link>
      <h1 className="mt-8 text-2xl font-bold tracking-tight">History</h1>
      <p className="mt-2 max-w-md text-zinc-400">
        Past generation runs and activity will appear here.
      </p>
    </div>
  );
}
