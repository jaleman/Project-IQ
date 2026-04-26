import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-900 to-brand-600 text-white">
      <div className="text-center max-w-2xl px-6">
        <h1 className="text-6xl font-bold mb-4">ProjectIQ</h1>
        <p className="text-xl text-blue-100 mb-10">
          AI-powered employee scheduling, task management, and team coordination — all in one place.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="bg-white text-brand-700 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="border border-white text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/10 transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
