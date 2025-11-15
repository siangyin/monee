"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { Wallet2, Users, User, Home } from "lucide-react"
import LocaleSwitcher from "@/components/LocaleSwitcher"

export default function TopNav() {
  const params = useParams() as { locale?: string }
  const pathname = usePathname() || "/"
  const locale = params.locale ?? "en"
  const base = `/${locale}`

  const links = [
    { href: `${base}`, label: "Home", icon: Home },
    { href: `${base}/groups`, label: "Groups", icon: Users },
    { href: `${base}/profile`, label: "Profile", icon: User },
  ]

  return (
    <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur supports-backdrop-filter:bg-white/70">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center gap-4">
          {/* Left: brand */}
          <Link href={base} className="flex items-center gap-2 shrink-0">
            <Wallet2 size={20} />
            <span className="font-semibold tracking-tight">monee</span>
          </Link>

          {/* Center: tabs (hidden on small, show on md+) */}
          <nav className="mx-auto hidden md:flex items-center gap-2">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition
                    ${
                      active
                        ? "bg-gray-100 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-black"
                    }
                  `}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Right: actions */}
          <div className="ml-auto flex items-center gap-2">
            {/* Compact icons on small screens */}
            <nav className="flex md:hidden items-center gap-1">
              {links.map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`rounded-md p-2 transition ${
                      active ? "bg-gray-100" : "hover:bg-gray-100"
                    }`}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={18} />
                  </Link>
                )
              })}
            </nav>

            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </header>
  )
}
