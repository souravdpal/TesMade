export default function Loading() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400">
      {/* soft background glow */}
      <div className="absolute h-96 w-96 animate-pulse rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex w-72 flex-col items-center gap-6 rounded-3xl border border-white/25 bg-white/15 p-10 text-white shadow-2xl backdrop-blur-md">
        {/* spinner with glow */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-white border-r-white/60" />
          <div className="absolute inset-3 animate-spin rounded-full border-4 border-transparent border-b-pink-300 [animation-direction:reverse] [animation-duration:1.2s]" />
          <div className="h-3 w-3 animate-pulse rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.9)]" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-semibold tracking-wide">Loading</p>
          <p className="text-sm text-white/70">Getting things ready for you</p>
        </div>

        {/* shimmer bar */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-1/2 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-white to-transparent" />
        </div>
      </div>
    </div>
  );
}