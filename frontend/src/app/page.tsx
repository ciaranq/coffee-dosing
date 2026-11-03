export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <p className="font-mono text-xs uppercase tracking-widest text-amber-400">
          Espresso Dial-In
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Extraction Tracker Scaffolded
        </h1>
        <p className="mt-2 text-sm text-white/70">
          Next.js App Router, Tailwind CSS, and Framer Motion initialized with Bun.
        </p>
      </div>
    </main>
  );
}

