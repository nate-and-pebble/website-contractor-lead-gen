export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center justify-center gap-8 px-8 py-32 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          Provider Lead Engine
        </h1>
        <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          Welcome to the Provider Lead Engine portal. Find and connect with the
          right providers for your needs.
        </p>
      </main>
    </div>
  );
}
