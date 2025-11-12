"use client"

import { useTransition } from "react"
import { createSampleData } from "@/app/[locale]/actions"

export default function SampleControls({ locale }: { locale: string }) {
  const [pending, start] = useTransition()

  return (
    <button
      onClick={() => start(() => createSampleData(locale))}
      disabled={pending}
      className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-60"
    >
      {pending ? "Creating…" : "Create sample data"}
    </button>
  )
}
