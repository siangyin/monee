// app/[locale]/layout.tsx
import { NextIntlClientProvider } from "next-intl"
import { notFound } from "next/navigation"
import { locales, type Locale } from "@/i18n"

import TopNav from "@/components/TopNav"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params

  if (!locales.includes(locale)) {
    notFound()
  }

  const messages = (await import(`@/messages/${locale}.json`)).default

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <TopNav />
      <div className="mx-auto max-w-6xl px-6">
        {/* responsive vertical rhythm */}
        <div className="py-6 md:py-8 lg:py-10 min-h-dvh">{children}</div>
      </div>
    </NextIntlClientProvider>
  )
}
