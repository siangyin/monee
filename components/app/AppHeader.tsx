// components/app/AppHeader.tsx
"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Menu, Home, Users, Settings } from "lucide-react"

type Props = {
  locale: string // e.g. "en" | "zh"
  title?: string
}

export default function AppHeader({ locale, title = "Monee" }: Props) {
  const base = `/${locale}`

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b">
      <div className="mx-auto max-w-screen-sm px-4">
        {/* Top Row */}
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-base font-semibold">{title}</span>
          </div>

          {/* Quick locale switch (simple + explicit) */}
          <div className="flex items-center gap-2">
            <Link
              href="/en"
              className="text-sm underline-offset-4 hover:underline"
            >
              EN
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <Link
              href="/zh"
              className="text-sm underline-offset-4 hover:underline"
            >
              中文
            </Link>
          </div>
        </div>

        {/* Nav Row */}
        <nav className="flex items-center justify-between py-2">
          <Link
            href={base}
            className="flex items-center gap-2 py-2 text-sm hover:opacity-80"
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>

          <Link
            href={`${base}/groups`}
            className="flex items-center gap-2 py-2 text-sm hover:opacity-80"
          >
            <Users className="h-4 w-4" />
            <span>Groups</span>
          </Link>

          <Link
            href={`${base}/settings`}
            className="flex items-center gap-2 py-2 text-sm hover:opacity-80"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
