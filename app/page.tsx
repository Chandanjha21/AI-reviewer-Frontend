import Link from 'next/link'
import { ArrowRight, LogIn, UserPlus } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f7f9] px-4 py-6 text-[#111827]">
      <section className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-4xl flex-col items-center justify-center text-center">
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-lg bg-[#111827] text-sm font-semibold text-white">
          AI
        </div>
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
          Human review for AI-generated follow-up emails.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[#5f6673]">
          Create an organization as an admin, or sign in with the reviewer account your admin created for you.
        </p>

        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#263244]"
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </Link>
          <Link
            href="/signup"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-[#d8dde6] bg-white px-4 text-sm font-semibold text-[#111827] transition hover:bg-[#eef2f7]"
          >
            <UserPlus className="h-4 w-4" />
            New organization
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
