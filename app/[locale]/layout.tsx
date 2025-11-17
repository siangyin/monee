// app/[locale]/layout.tsx

import { NextIntlClientProvider } from "next-intl"
import { notFound } from "next/navigation"
import { locales, type Locale } from "@/i18n"

import TopNav from "@/components/TopNav"
// import AppHeader from "@/components/app/AppHeader"

import ToasterHost from "@/components/ToasterHost"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params

  if (!locales.includes(locale as Locale)) {
    notFound()
  }

  const messages = (await import(`@/messages/${locale}.json`)).default

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ToasterHost />
      {/* <AppHeader locale={locale} /> */}
      <TopNav />
      <div className="mx-auto max-w-6xl px-6">
        <div className="py-6 md:py-8 lg:py-10 min-h-dvh">{children}</div>
      </div>
    </NextIntlClientProvider>
  )
}
