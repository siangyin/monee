// app/[locale]/layout.tsx
import { ClerkProvider } from "@clerk/nextjs"
import { NextIntlClientProvider } from "next-intl"
import { notFound } from "next/navigation"
import { locales, type Locale } from "@/i18n"
import { Inter } from "next/font/google"
import { Metadata } from "next"

import TopNav from "@/components/TopNav"
import AppHeader from "@/components/app/AppHeader"

import "../globals.css"

const inter = Inter({ subsets: ["latin"] })

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export const metadata: Metadata = {
  title: "monee",
  description: "Track expenses easily",
}

type PageProps = Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: Locale }>
}>

export default async function LocaleLayout({ children, params }: PageProps) {
  const { locale } = await params

  if (!locales.includes(locale)) {
    notFound()
  }

  const messages = (await import(`@/messages/${locale}.json`)).default

  return (
    <ClerkProvider>
      <html lang={locale} suppressHydrationWarning>
        <head />
        <body className={inter.className}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <AppHeader locale={locale} />
            <TopNav />
            <div className="mx-auto max-w-6xl px-6">
              <div className="py-6 md:py-8 lg:py-10 min-h-dvh">{children}</div>
            </div>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
