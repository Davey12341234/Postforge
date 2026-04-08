import Link from "next/link";
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">PostForge</h1>
      <p className="text-xl text-zinc-400 mb-8 max-w-md">Plan, schedule, and ship social content without the chaos.</p>
      <Link href="/auth/signin" className="px-8 py-4 bg-white text-zinc-950 font-bold rounded-lg hover:bg-zinc-200 transition-colors text-lg">Get Started</Link>
    </div>
  );
}
