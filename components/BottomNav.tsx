"use client"

import Link from "next/link"
import { Home, Users, User } from "lucide-react"
import { useParams, usePathname } from "next/navigation"

export default function BottomNav() {
  const params = useParams() as { locale?: string }
  const pathname = usePathname() || "/"
  const locale = params.locale ?? "en"
  const base = `/${locale}`

  const nav = [
    { href: `${base}`, label: "Home", icon: <Home size={20} /> },
    { href: `${base}/groups`, label: "Groups", icon: <Users size={20} /> },
    { href: `${base}/profile`, label: "Profile", icon: <User size={20} /> },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white/80 backdrop-blur supports-backdrop-filter:bg-white/60">
      <div className="mx-auto max-w-md flex justify-around py-2">
        {nav.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center text-xs ${
                active ? "font-medium" : "opacity-70"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
