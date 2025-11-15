"use client"

import { locales } from "@/i18n"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function LocaleSwitcher() {
  const pathname = usePathname() || "/"

  // strip existing /en or /zh from the front to avoid /en/en/...
  const cleaned = pathname.replace(/^\/(en|zh)(?=\/|$)/, "") || "/"

  return (
    <div className="flex items-center gap-1">
      {locales.map((loc) => {
        const href = `/${loc}${cleaned}`
        return (
          <Link
            key={loc}
            href={href}
            className="rounded-md border px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
          >
            {loc.toUpperCase()}
          </Link>
        )
      })}
    </div>
  )
}
