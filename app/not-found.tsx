import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-6 text-white">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-white/25 bg-white/15 p-10 text-center shadow-xl backdrop-blur-md">
        <p className="text-7xl font-bold">404</p>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-white/80">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/home"
          className="mt-2 rounded-xl bg-white/20 px-5 py-2 font-medium transition hover:bg-white/30"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}