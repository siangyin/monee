// app/[locale]/page.tsx
"use client"

import LocaleSwitcher from "@/components/LocaleSwitcher"
import { useTranslations } from "next-intl"

export default function HomePage() {
  const t = useTranslations() // reads from messages/en.json or messages/zh.json
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">{t("hello")}</h1>
      <p className="mt-2 text-sm text-gray-600">
        Welcome to monee — tap the language switcher below.
      </p>
      <div className="mt-6">
        <LocaleSwitcher />
      </div>
    </main>
  )
}
