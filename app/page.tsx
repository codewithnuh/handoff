import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 px-4">
      <main className="flex w-full max-w-md flex-col items-center gap-6 py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Handoff Auth Tester
        </h1>
        <p className="text-zinc-500">
          Use the pages below to test that register and login work against the
          Better Auth server actions.
        </p>
        <div className="flex w-full flex-col gap-3">
          <Link
            href="/register"
            className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Register
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
          >
            Login
          </Link>
        </div>
      </main>
    </div>
  );
}
