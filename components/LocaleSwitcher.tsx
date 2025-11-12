"use client"

import { locales } from "@/i18n"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function LocaleSwitcher() {
  const pathname = usePathname() || "/"

  // strip existing /en or /zh from the front to avoid /en/en/...
  const cleaned = pathname.replace(/^\/(en|zh)(?=\/|$)/, "") || "/"

  return (
    <div className="fixed bottom-4 inset-x-0 flex justify-center gap-3">
      {locales.map((loc) => {
        const href = `/${loc}${cleaned}`
        return (
          <Link
            key={loc}
            href={href}
            className="rounded-full border px-3 py-1 text-sm bg-white/80 backdrop-blur shadow"
          >
            {loc.toUpperCase()}
          </Link>
        )
      })}
    </div>
  )
}
